require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/Basemap",
  "esri/core/watchUtils",
  "esri/Ground"
], function (Map, MapView, FeatureLayer, Basemap, watchUtils, Ground) {
  // create basemap layers
  const countryBorders = new FeatureLayer({
    url:
      "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [255, 255, 255, 0.8],
          width: 0.5
        }
      }
    }
  });

  const plateTectonicBorders = new FeatureLayer({
    url:
      "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/plate_tectonics_boundaries/FeatureServer/0",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-line",
        width: 1,
        color: [255, 133, 125, 0.7]
      }
    }
  });

  // create map object
  const map = new Map({
    basemap: "dark-gray"
  });

  //create map view
  const view = new MapView({
    container: "view-container",
    map: map,
    center: [-118.25320895105988, 34.06152260947359],
    zoom: 7
  });

  map.add(countryBorders);
  map.add(plateTectonicBorders);

  // ***********
  // add earthquakes
  // *************

  const defaultSym = {
    type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
    color: [255, 250, 239, 0.8],
    outline: {
      color: [0, 0, 0, 0],
      width: 0
    }
  };
  const renderer = {
    type: "simple", // autocasts as new SimpleRenderer()
    symbol: defaultSym,
    visualVariables: [
      {
        type: "size",
        field: "mag",
        stops: [
          { value: 5.5, size: 7, label: "5.5" }, //don't understand the label here
          { value: 7, size: 25, label: "7" }
        ]
      },
      {
        type: "color",
        field: "mag",
        legendOptions: {
          title: "Magnitude"
        },
        stops: [
          { value: 6, color: [254, 240, 217], label: "4.0 - 6" },
          { value: 7, color: [179, 0, 0], label: ">7" }
        ]
      }
    ]
  };

  const earthquakeLayer = new FeatureLayer({
    url:
      "https://services9.arcgis.com/RHVPKKiFTONKtxq3/ArcGIS/rest/services/Historical_Quakes/FeatureServer/0",
    screenSizePerspectiveEnabled: false,
    renderer: renderer,
    popupTemplate: {
      content:
        "Magnitude {mag} {type} hit {place} on {time} at a depth of {kmDepth} km. (Event ID {id})",
      title: "Earthquake Information",
      fieldInfos: [
        {
          fieldName: "time",
          format: {
            dateFormat: "short-date-long-time-24"
          }
        },
        {
          fieldName: "mag",
          format: {
            places: 1,
            digitSeparator: true
          }
        },
        {
          fieldName: "kmDepth",
          format: {
            places: 1,
            digitSeparator: true
          }
        }
      ]
    }
  });

  //   add earthquakes to map
  map.add(earthquakeLayer);

  //   create list of buttons along bottom
  let earthquakeLayerView = null;
  let highlightHandler = null;

  view.whenLayerView(earthquakeLayer).then(function (lyrView) {
    earthquakeLayerView = lyrView;
  });

  function formatDate(date) {
    const fDate = new Date(date);
    const year = fDate.getFullYear();
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      fDate
    );
    const day = fDate.getDate();
    const hours = fDate.getHours();
    const minutes = fDate.getMinutes();
    const prefix = minutes < 10 ? "0" : "";
    return `${day} ${month} ${year}, at ${hours}:${prefix}${minutes}`;
  }

  let zooming = false;

  earthquakeLayer
    .queryFeatures({
      where: "mag > 7",
      //    if outFields isn't specified, only unique id field will be returned
      outFields: "OBJECTID, place, time, mag, kmDepth",
      //     need to explicitly tell query to return geometry
      returnGeometry: true
    })
    .then(function (result) {
      const features = result.features;
      const list = document.getElementById("earthquake-list");
      features.forEach(function (earthquake) {
        const attr = earthquake.attributes;
        const content = document.createElement("div");
        content.innerHTML = `
          <div>
            <h3>${attr.place}</h3>
            <span class="date-time"><i>${formatDate(attr.time)}</i></span>
            </br>
            Magnitude ${attr.mag} | Depth ${attr.kmDepth} km
          </div>
        `;
        const goToButton = document.createElement("button");
        goToButton.innerText = "Zoom to earthquake";
        goToButton.addEventListener("click", function () {
          zooming = true;
          //           changed target to center, made "earthquake" argument into [earthquake.geometry.x, earthquake.geometry.y]
          view.goTo(
            //             the set zoom doesn't work for the deeper earthquakes, may need to zoom further to get them to highligh
            {
              center: [earthquake.geometry.x, earthquake.geometry.y],
              zoom: 10
            },
            { speedFactor: 0.5 }
          );

          if (earthquakeLayerView) {
            if (highlightHandler) {
              highlightHandler.remove();
            }
            highlightHandler = earthquakeLayerView.highlight(earthquake);
          }
        });
        content.appendChild(goToButton);
        list.appendChild(content);
      });
    });

  //   legen button
  let legendVisible = true;
  const legendController = document.getElementById("legend-control");
  const legendContainer = document.getElementById("legend");
  legendController.addEventListener("click", function () {
    legendContainer.style.display = legendVisible ? "none" : "block";
    legendController.innerHTML = legendVisible
      ? "Show explanation"
      : "Hide explanation";
    legendVisible = !legendVisible;
  });
});

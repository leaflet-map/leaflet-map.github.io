const __feature__ = "allfeatures";
const __marker__ = "pin";

customElements.define(
  "leaflet-map",
  class leafletMap extends HTMLElement {
    // ************************************************************************ Properties
    // ======================================================================== CDN
    get CDN() {
      return (
        this.getAttribute("cdn") ||
        "//unpkg.com/leaflet@" +
          (this.getAttribute("version") || "latest") +
          "/dist"
      );
    }
    // ======================================================================== tileLayer
    get tileLayer() {
      return (
        this.getAttribute("tilelayer") ||
        "//tile.openstreetmap.org/{z}/{x}/{y}.png"
      );
    }
    // ======================================================================== mapdiv
    get mapdiv() {
      return this.shadowRoot.querySelector("div");
    }
    // ======================================================================== defaultMarkerIcon
    // get markercolor() {
    //   return this.getAttribute("markercolor") || "royalblue";
    // }
    // get defaultMarkerIcon() {
    //   return this.L.icon({
    //     iconSize: [25, 41],
    //     iconAnchor: [12, 39],
    //     iconUrl: this.CDN + "/images/marker-icon.png",
    //     shadowUrl: this.CDN + "/images/marker-shadow.png",
    //   });
    // }
    // ************************************************************************ Lifecycle
    // ======================================================================== constructor
    constructor() {
      super().attachShadow({ mode: "open" }).innerHTML =
        `<style>.leaflet-control-zoom{display:none}</style>` +
        `<link rel="stylesheet" href="${this.CDN}/leaflet.css" onload="this.getRootNode().host.mapdiv.style.opacity=1">` +
        `<div style="width:100%;height:100%;opacity:0"/>`;
      this.markers = [];
      this.features = new Map();
    }
    // ======================================================================== connectedCallback
    connectedCallback() {
      // todo create save connectedCallback reentry
      let init = () => {
        this.L = window.L; // map to global L once
        this.render();
        this.addmarkers();
      };
      if (window.L && window.L.map) init();
      else
        document.head.append(
          Object.assign(document.createElement("script"), {
            src: this.CDN + "/leaflet.js",
            onload: () => init(),
          })
        );
    }
    // ************************************************************************ Methods
    // ======================================================================== render
    render() {
      this.shadowRoot.append(...this.querySelectorAll("[shadowRoot]"));
      this.map = this.L.map(this.mapdiv);
      this.map.addLayer(this.L.tileLayer(this.tileLayer, {}));
      this.map.on("click", (leafletEvent) => this.mapclick(leafletEvent));
      this.map.on("zoomstart", (leafletEvent) =>
        this.mapzoomstart(leafletEvent)
      );
      this.map.on("zoomend", (leafletEvent) => this.mapzoomend(leafletEvent));
      this.setView({
        lat: this.getAttribute("lat") || 52.2957,
        lng: this.getAttribute("lng") || 4.6804,
      });
    }
    // ======================================================================== mapclick
    mapclick(leafletEvent) {
      if (leafletEvent.originalEvent.ctrlKey) {
        let { lat, lng } = leafletEvent.latlng;
        let marker = this.marker({
          lat,
          lng,
          feature: "latlng",
        });
        this.markerlabel({
          marker,
          lat,
          lng,
          label: `lat:${lat}<br>lng:${lng}`,
        });
      }
    }
    mapzoomstart(leafletEvent) {
      //console.warn(leafletEvent);
    }
    mapzoomend(leafletEvent) {
      //console.warn(leafletEvent);
    }
    // ======================================================================== addmarkers
    addmarkers({ markers } = { markers: this.querySelectorAll("marker") }) {
      markers.forEach((markerNode) => {
        let _attr = (name) =>
          markerNode.getAttribute(name) ||
          markerNode.parentNode.getAttribute(name);
        this.marker({
          markerNode,
          lat: markerNode.getAttribute("lat") || undefined,
          lng: markerNode.getAttribute("lng") || undefined,
          popup: markerNode.innerHTML,
          openPopup: markerNode.hasAttribute("openPopup"),
          feature: _attr("feature") || __feature__,
          icon: _attr("icon") || __marker__,
        });
      });
      this.fitBounds({
        feature: this.getAttribute("feature") || __feature__,
      });
    }
    // ======================================================================== fitBounds
    fitBounds({ feature }) {
      if (feature) {
        let featureGroup = this.getFeatureGroup(feature);
        let count = featureGroup.getLayers().length;
        if (count > 1) this.map.fitBounds(featureGroup.getBounds());
        else if (count) this.map.panInsideBounds(featureGroup.getBounds());
        else console.warn(`no fitBounds: ${feature}`);
      } else {
        // todo fitBounds to lat lng
      }
    }
    // ======================================================================== feature
    getFeatureGroup(name) {
      if (name)
        return (
          this.features.get(name) ||
          this.features.set(name, this.L.featureGroup()).get(name)
        );
      else return this.getFeatureGroup(__feature__);
    }
    feature({ feature = __feature__, node }) {
      node.addTo(this.getFeatureGroup(feature));
      if (feature != __feature__)
        node.addTo(this.getFeatureGroup(__feature__));
    }
    // ======================================================================== featurezoom
    // ======================================================================== setView
    setView({
      lat = 52.2957,
      lng = 4.6804,
      zoom = this.getAttribute("zoom") || 13,
    }) {
      this.map.setView([lat, lng], zoom);
    }
    // ======================================================================== circle
    circle({
      lat,
      lng,
      color = "green",
      fillColor = "lightgreen",
      fillOpacity = 0.5,
      radius = 100,
    }) {
      let circle = this.L.circle([lat, lng], {
        color,
        fillColor,
        fillOpacity,
        radius,
      });
      circle.addTo(this.map);
      return circle;
    }
    // ======================================================================== marker
    marker({
      markerNode,
      lat = 52.2957,
      lng = 4.6804,
      popup,
      openPopup = false,
      icon,
      feature,
      label = markerNode.getAttribute("label"),
    }) {
      //this.circle({ lat, lng });
      let marker = this.L.marker([lat, lng], {
        icon: this.L.divIcon({
          html: `<leaflet-marker-icon icon="${icon}"></leaflet-marker-icon>`,
          className: "marker-svg",
          iconSize: [40, 80],
          iconAnchor: [20, 38],
        }),
      });
      this.markers.push(marker);
      marker.addTo(this.map);
      this.feature({ node: marker, feature });
      // ---------------------------------------------------------------------- marker tooltip
      this.markerlabel({ marker, lat, lng, label });
      // ---------------------------------------------------------------------- marker popup
      if (popup) marker.bindPopup(popup, { offset: this.L.point(0, -30) });
      if (openPopup) marker.openPopup();
      return marker;
    }
    // ======================================================================== markerlabel
    markerlabel({ marker, lat, lng, label }) {
      if (label) {
        if (label == "postcode") {
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          ).then((response) => {
            response.json().then((data) => {
              //console.log(data);
              label = data.address.postcode;
              marker
                .bindTooltip(label, { permanent: true, direction: "bottom" })
                .addTo(this.map);
            });
          });
        } else {
          marker
            .bindTooltip(label, { permanent: true, direction: "bottom" })
            .addTo(this.map);
        }
      }
    }
    // ========================================================================
  }
);

customElements.define(
  "leaflet-marker-icon",
  class extends HTMLElement {
    connectedCallback() {
      let icon = this.getAttribute("icon");
      if (icon.includes(".")) {
        this.innerHTML = `<img src="${icon}" />`;
      } else {
        let pin =
          "130;m65 0c-24 0-43 19-43 43 0 8 2 15 6 21 2 3 0 0 2 3l36 62 36-62c2-3 0 0 2-3 4-6 6-14 6-21 0-24-19-42-45-43zm0 22c12 0 22 10 22 22 0 12-10 22-22 22s-22-10-22-22c0-12 10-22 22-22z";
        let data =
          {
            bus: "110;m10 72c0 4 2 8 5 11v9c0 3 2 5 5 5h5c3 0 5-2 5-5v-5h40v5c0 3 2 5 5 5h5c3 0 5-2 5-5v-9c3-3 5-7 5-11v-50c0-18-18-20-40-20s-40 3-40 20v50zm18 5c-4 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8zm45 0c-4 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8zm8-30h-60v-25h60v25z",
            house:
              "170;m160 90a5 5 90 01-4-2l-72-72-72 72a5 5 90 01-7-7l75-75a5 5 90 017 0l75 75a5 5 90 01-3 9zm-76-56-60 60v61a10 10 90 0010 10h35v-50h30v50h35a10 10 90 0010-10v-61z",
          }[icon] || pin;
        let [box, d] = data.split(";");
        this.innerHTML =
          `<svg viewBox="0 0 ${box} ${box}">` +
          `<style>path{fill:var(--lfm-marker,firebrick)}</style>` +
          `<path d="${d}"/>` +
          `</svg>`;
      }
    }
  }
);

---
title: Layer Groups and Layers Control
outline: [2,4]
description: A tutorial on how to manage groups of layers and use the layer switching control.
order: 7
---

# Layer Groups and Layers Control

This tutorial will show you how to group several layers into one, and how to use the layers control to allow users to easily switch different layers on your map.

<RenderMap @mapReady="onMapReady" />

### Layer Groups

Let's suppose you have a bunch of layers you want to combine into a group to handle them as one in your code:

```js
const littleton = new Marker([39.61, -105.02]).bindPopup('This is Littleton, CO.');
const denver = new Marker([39.74, -104.99]).bindPopup('This is Denver, CO.');
const aurora = new Marker([39.73, -104.8]).bindPopup('This is Aurora, CO.');
const golden = new Marker([39.77, -105.23]).bindPopup('This is Golden, CO.');
```
Instead of adding them directly to the map, you can do the following, using the <a href="/reference.html#layergroup">LayerGroup</a> class:

```js
const cities = new LayerGroup([littleton, denver, aurora, golden]);
```

Easy enough! Now you have a `cities` layer that combines your city markers into one layer you can add or remove from the map at once.

### Layers Control

Leaflet has a nice little control that allows your users to control which layers they see on your map. In addition to showing you how to use it, we'll also show you another handy use for layer groups.

There are two types of layers: (1) base layers that are mutually exclusive (only one can be visible on your map at a time), e.g. tile layers, and (2) overlays, which are all the other stuff you put over the base layers. In this example, we want to have two base layers (OpenStreetMap 'osm' and OpenStreetMap.Hot `osmHOT` base map) to switch between, and an overlay to switch on and off: the city markers we created earlier.

Now let's create those base layers and add the default ones to the map:

```js
const osm = new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const osmHOT = new TileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'});

const map = new LeafletMap('map', {
    center: [39.73, -104.99],
    zoom: 10,
    layers: [osm, cities]
});
```

Next, we'll create two objects. One will contain our base layers and one will contain our overlays. These are just simple objects with key/value pairs. The key sets the text for the layer in the control (e.g. "OpenStreetMap"), while the corresponding value is a reference to the layer (e.g. `osm`).

```js
const baseMaps = {
    "OpenStreetMap": osm,
    "OpenStreetMap.HOT": osmHOT
};

const overlayMaps = {
    "Cities": cities
};
```

Now, all that's left to do is to create a [Layers Control](/reference.html#control-layers) and add it to the map. The first argument passed when creating the layers control is the base layers object. The second argument is the overlays object. Both arguments are optional: you can pass just a base layers object by omitting the second argument, or just an overlays objects by passing `null` as the first argument. In each case, the omitted layer type will not appear for the user to select.

```js
const layerControl = new LayersControl(baseMaps, overlayMaps).addTo(map);
```

Note that we added `osm` and `cities` layers to the map but didn't add `osmHOT`. The layers control is smart enough to detect what layers we've already added and have corresponding checkboxes and radioboxes set.

Also note that when using multiple base layers, only one of them should be added to the map at instantiation, but all of them should be present in the base layers object when creating the layers control.

You can also style the keys when you define the objects for the layers. For example, this code will make the label for the OpenStreetMap.HOT map red:

```js
const baseMaps = {
    "OpenStreetMap": osm,
    "&lt;span style='color: red'&gt;OpenStreetMap.HOT&lt;/span&gt;": osmHOT
};
```

Finally, you can add or remove base layers or overlays dynamically:

```js
const crownHill = new Marker([39.75, -105.09]).bindPopup('This is Crown Hill Park.'),
    rubyHill = new Marker([39.68, -105.00]).bindPopup('This is Ruby Hill Park.');

const parks = new LayerGroup([crownHill, rubyHill]);
const openTopoMap = new TileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

layerControl.addBaseLayer(openTopoMap, "OpenTopoMap");
layerControl.addOverlay(parks, "Parks");
```


Now let's [view the result on a separate page &rarr;](example.html)

<script setup>
const onMapReady = (map, L) => {
	const cities = new L.LayerGroup();
	const mLittleton = new L.Marker([39.61, -105.02]).bindPopup('This is Littleton, CO.').addTo(cities);
	const mDenver = new L.Marker([39.74, -104.99]).bindPopup('This is Denver, CO.').addTo(cities);
	const mAurora = new L.Marker([39.73, -104.8]).bindPopup('This is Aurora, CO.').addTo(cities);
	const mGolden = new L.Marker([39.77, -105.23]).bindPopup('This is Golden, CO.').addTo(cities);
	const osm = new L.TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});

	const osmHOT = new L.TileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
	});

	// const map = new L.Map('map', {
	// 	center: [39.73, -104.99],
	// 	zoom: 10,
	// 	layers: [osm, cities]
	// });
    map.setView([39.73, -104.99], 10);
    osm.addTo(map);
    cities.addTo(map);
	const baseLayers = {
		'OpenStreetMap': osm,
		'OpenStreetMap.HOT': osmHOT
	};

	const overlays = {
		'Cities': cities
	};

	const layerControl = new L.Control.Layers(baseLayers, overlays).addTo(map);

	const crownHill = new L.Marker([39.75, -105.09]).bindPopup('This is Crown Hill Park.');
	const rubyHill = new L.Marker([39.68, -105.00]).bindPopup('This is Ruby Hill Park.');

	const parks = new L.LayerGroup([crownHill, rubyHill]);

	const openTopoMap = new L.TileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
	});
	layerControl.addBaseLayer(openTopoMap, 'OpenTopoMap');
	layerControl.addOverlay(parks, 'Parks');
};
</script>
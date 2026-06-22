function icon(p){
  const todoClass = p.status==="未攻略" ? "todoIcon" : "";

  return L.divIcon({
    html:`
      <div class="markerWrap">
        <img
          class="markerImg ${todoClass}"
          src="${statusImage(p.status)}"
          alt="${p.status}"
        >
      </div>
    `,
    className:"",
    iconSize:[110,90],
    iconAnchor:[32,42],
    popupAnchor:[0,-40]
  });
}
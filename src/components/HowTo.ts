export default function HowTo() {
  const div = document.createElement("div");
  div.classList.add("how-to");

  const p = document.createElement("p");
  p.appendChild(
    document.createTextNode(
      "For each bright purple or bright yellow tile above, click the corresponding tile on the game on Flight Rising",
    ),
  );
  div.appendChild(p);

  return div;
}

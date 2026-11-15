import { DATA } from "../../../lib/data.js";
import { ogImage, pngResponse } from "../../../lib/og.js";

export const getStaticPaths = () => DATA.mechanics.map((m) => ({ params: { slug: m.slug }, props: { m } }));

export async function GET({ props: { m } }) {
  return pngResponse(await ogImage({
    kicker: m.type === "Engine" ? "Mechanic · Engine" : "Mechanic · Tip", title: m.head,
    chips: m.patch ? [{ text: "Patch " + m.patch }] : [], body: m.desc,
  }));
}

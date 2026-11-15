import { DATA } from "../../../lib/data.js";
import { ogImage, pngResponse } from "../../../lib/og.js";

export const getStaticPaths = () => DATA.builds.map((b) => ({ params: { slug: b.slug }, props: { b } }));

export async function GET({ props: { b } }) {
  return pngResponse(await ogImage({
    kicker: "Build guide", title: b.name, subtitle: b.version || b.skills,
    chips: [{ text: b.status, status: b.status }, { text: b.cls }, { text: b.asc }, { text: "Patch " + b.patch }],
    body: b.version ? b.skills : null,
  }));
}

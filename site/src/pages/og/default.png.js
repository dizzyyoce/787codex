import { DATA } from "../../lib/data.js";
import { ogImage, pngResponse } from "../../lib/og.js";

export async function GET() {
  return pngResponse(await ogImage({
    kicker: "PoE2 reference", title: "Builds, mechanics and strategy from 787prada's videos",
    chips: [{ text: DATA.builds.length + " builds" }, { text: DATA.mechanics.length + " mechanics" }, { text: DATA.videos.length + " videos" }],
  }));
}

import webm5 from "@/assets/exercises/desenvolvimento-com-halteres.webm.asset.json";
import webm4 from "@/assets/exercises/leg-press.webm.asset.json";
import webm3 from "@/assets/exercises/elevacao-lateral.webm.asset.json";
import webm2 from "@/assets/exercises/rosca-direta.webm.asset.json";
import webm1 from "@/assets/exercises/supino-inclinado-com-halteres.webm.asset.json";
import webm0 from "@/assets/exercises/supino-reto.webm.asset.json";
import video0 from "@/assets/exercises/supino-reto.mp4.asset.json";
import gif0 from "@/assets/exercises/supino-reto.gif.asset.json";
import video1 from "@/assets/exercises/supino-inclinado-com-halteres.mp4.asset.json";
import gif1 from "@/assets/exercises/supino-inclinado-com-halteres.gif.asset.json";
import video2 from "@/assets/exercises/rosca-direta.mp4.asset.json";
import gif2 from "@/assets/exercises/rosca-direta.gif.asset.json";
import video3 from "@/assets/exercises/elevacao-lateral.mp4.asset.json";
import gif3 from "@/assets/exercises/elevacao-lateral.gif.asset.json";
import video4 from "@/assets/exercises/leg-press.mp4.asset.json";
import gif4 from "@/assets/exercises/leg-press.gif.asset.json";
import video5 from "@/assets/exercises/desenvolvimento-com-halteres.mp4.asset.json";
import gif5 from "@/assets/exercises/desenvolvimento-com-halteres.gif.asset.json";
export const EXERCISE_MOTION: Record<string, { videoUrl: string; webmUrl: string; gifUrl: string; mediaCredit: { author: string; sourceUrl: string; license: string; licenseUrl: string } }> = {
  "supino-reto": { videoUrl: video0.url, webmUrl: webm0.url, gifUrl: gif0.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/73/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
  "supino-inclinado-com-halteres": { videoUrl: video1.url, webmUrl: webm1.url, gifUrl: gif1.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/537/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
  "rosca-direta": { videoUrl: video2.url, webmUrl: webm2.url, gifUrl: gif2.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/91/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
  "elevacao-lateral": { videoUrl: video3.url, webmUrl: webm3.url, gifUrl: gif3.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/348/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
  "leg-press": { videoUrl: video4.url, webmUrl: webm4.url, gifUrl: gif4.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/371/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
  "desenvolvimento-com-halteres": { videoUrl: video5.url, webmUrl: webm5.url, gifUrl: gif5.url, mediaCredit: { author: "Goulart · wger", sourceUrl: "https://wger.de/en/exercise/567/view/", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
};

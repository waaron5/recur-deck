// The landmark ladder: what a run asks Commons for when the obvious search
// comes back with nothing usable.
//
// landmark.js finds and downloads a photo for one phrase. Which phrase to ask
// for, and what to ask for next when that one fails, is a policy rather than a
// search, and decision 07 sets it: a recognisable landmark in the headquarters
// city, then that city's skyline, then a landmark in the nearest major metro,
// then a state or regional one. The two halves are kept apart because they fail
// differently - a search that finds nothing is Commons' business, and a cover
// showing the wrong city is the run's.
//
// The last two rungs are quality notes, not defects. A cover carrying the
// region's best-known landmark is a weaker sales piece than one carrying the
// company's own skyline, and it is still a deck worth mailing. Only a cover with
// no photo at all is a critical defect, and that is reached when every rung
// fails rather than when the ladder merely has to step down one.
//
// The metro and the region are supplied by the run rather than worked out here.
// "The nearest major metro within about 60 km" is a question about a map, and
// answering it in code would mean carrying a gazetteer inside a package that has
// 200 files to spend and no room for one.

const { findLandmarkPhoto, cityLandmarkSearch, LandmarkNotFound } = require('./landmark.js');

/**
 * @typedef {import('./http.js').FetchLike} FetchLike
 * @typedef {{city?: string, metro?: string, region?: string}} Headquarters
 * @typedef {{rung: string, search: string, qualityNote: boolean, fallback: string}} Rung
 */

/**
 * Commons searches better on plain words, and a comma in a place name is not a
 * word. The state is kept: it is what keeps same-named cities in other states
 * out of the results.
 *
 * @param {unknown} place
 * @returns {string}
 */
const plainPlace = (place) =>
  String(place ?? '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The searches to try, in the order decision 07 puts them.
 *
 * A rung whose place the run could not establish is left out rather than
 * searched for blankly: asking Commons for " landmark" returns whatever it has,
 * which is how a cover ends up showing somewhere nobody chose.
 *
 * Each rung is built once, carrying everything true about it: what to search
 * for, whether reaching it is a quality note, and how the reply names it. The
 * alternative - deciding the phrase later from the rung's name - meant branching
 * on rung identity in two places, which is two places to disagree about what a
 * metro rung is.
 *
 * `fallback` is empty for the two rungs that stayed in the headquarters city. A
 * run lists its fallbacks so a reader can weigh them, and a list including "the
 * cover shows the company's own city" would be listing the thing that was
 * supposed to happen.
 *
 * @param {Headquarters} [headquarters]
 * @returns {Rung[]}
 */
function landmarkLadder({ city, metro, region } = {}) {
  /** @type {Rung[]} */
  const rungs = [];

  const here = plainPlace(city);
  if (here) {
    // Asking for a landmark and asking for a skyline are two requests, not one
    // phrase. Combining them measured worse on the cities this already serves,
    // which ticket 02's comments record.
    rungs.push({
      rung: 'city-landmark',
      search: `${here} landmark`,
      qualityNote: false,
      fallback: '',
    });
    rungs.push({
      rung: 'city-skyline',
      search: cityLandmarkSearch(city),
      qualityNote: false,
      fallback: '',
    });
  }

  const near = plainPlace(metro);
  if (near) {
    rungs.push({
      rung: 'metro-landmark',
      search: `${near} landmark`,
      qualityNote: true,
      fallback: `metro landmark (${metro})`,
    });
  }

  const wider = plainPlace(region);
  if (wider) {
    rungs.push({
      rung: 'region-landmark',
      search: `${wider} landmark`,
      qualityNote: true,
      fallback: `regional landmark (${region})`,
    });
  }

  return rungs;
}

/**
 * Walk the ladder until a photo comes back.
 *
 * What comes back carries the rung it came from, because the difference between
 * rungs is not visible in the photo. An unremarked Dallas skyline on an Oklahoma
 * City company reads as a mistake; the same picture, named as the fallback it
 * is, reads as a decision someone can agree or disagree with.
 *
 * Running out of rungs throws rather than returning a coverless deck: decision
 * 07 makes a cover with no photo a critical defect, and the caller turns this
 * into one.
 *
 * What comes back carries `fallback` rather than a separate quality-note flag,
 * because they say the same thing: a fallback phrase exists exactly when the
 * cover had to leave the company's own city.
 *
 * @param {object} options
 * @param {Headquarters} options.headquarters
 * @param {FetchLike} [options.fetchImpl]
 * @returns {Promise<{
 *   photo: Buffer, width: number, height: number, credit: any,
 *   rung: string, fallback: string,
 * }>}
 */
async function findLandmarkOnLadder({ headquarters, fetchImpl }) {
  const rungs = landmarkLadder(headquarters);
  if (rungs.length === 0) {
    throw new LandmarkNotFound('there is no headquarters city to find a cover photo for');
  }

  /** @type {string[]} */
  const tried = [];

  for (const rung of rungs) {
    try {
      const found = await findLandmarkPhoto({ search: rung.search, fetchImpl });
      return { ...found, rung: rung.rung, fallback: rung.fallback };
    } catch (error) {
      // A rung with nothing on it is the ladder working. Anything else - a
      // Commons that answered with an error, a download that threw - is not
      // this module's to swallow, and stepping down would hide it.
      if (!(error instanceof LandmarkNotFound)) throw error;
      tried.push(rung.search);
    }
  }

  throw new LandmarkNotFound(
    `no usable Commons photo on any rung of the ladder: tried ${tried.join('; ')}`,
  );
}

module.exports = { landmarkLadder, findLandmarkOnLadder };

/**
 * ContentProvider contract draft.
 *
 * This file intentionally contains no runtime implementation.
 * It documents the adapter shape that future providers should follow.
 *
 * @typedef {Object} ContentProvider
 * @property {string} id Provider identifier, for example "tmdb".
 * @property {string} name Human-readable provider name.
 * @property {(request: ContentSearchRequest) => Promise<ContentSearchResult[]>} search
 * @property {(request: ContentDetailRequest) => Promise<ContentDetail | null>} getDetail
 * @property {(request: ContentRecommendationRequest) => Promise<ContentSearchResult[]>} getRecommendations
 * @property {(request: ContentTrendingRequest) => Promise<ContentSearchResult[]>} getTrending
 *
 * @typedef {Object} ContentSearchRequest
 * @property {string} query User-entered title or keyword.
 * @property {string[]=} contentTypes movie, series, animation, or future content types.
 * @property {string=} locale Preferred locale, for example "ko-KR".
 * @property {string=} region Preferred region, for example "KR".
 *
 * @typedef {Object} ContentDetailRequest
 * @property {string} providerContentId External provider content id.
 * @property {string=} contentType MyOTT content type hint.
 * @property {string=} locale Preferred locale.
 * @property {string=} region Preferred region.
 *
 * @typedef {Object} ContentRecommendationRequest
 * @property {string[]=} likedTitles User-entered liked titles.
 * @property {string[]=} filters Quick Pick or OTT filters.
 * @property {string=} locale Preferred locale.
 * @property {string=} region Preferred region.
 *
 * @typedef {Object} ContentTrendingRequest
 * @property {string[]=} contentTypes movie, series, animation, or future content types.
 * @property {string=} locale Preferred locale.
 * @property {string=} region Preferred region.
 *
 * @typedef {Object} ContentSearchResult
 * @property {string} providerId External provider id, for example "tmdb".
 * @property {string} providerContentId External provider content id.
 * @property {string} title Normalized title.
 * @property {string} contentType MyOTT content type.
 * @property {string[]=} genres Normalized genres.
 * @property {string=} poster Poster URL or path.
 * @property {string=} overview Short overview.
 *
 * @typedef {Object} ContentDetail
 * @property {string} providerId External provider id.
 * @property {string} providerContentId External provider content id.
 * @property {string} title Normalized title.
 * @property {string} contentType MyOTT content type.
 * @property {string[]=} genres Normalized genres.
 * @property {string=} director Director or creator display name.
 * @property {string[]=} actors Main actor display names.
 * @property {string=} poster Poster URL or path.
 * @property {string=} overview Full overview.
 * @property {string[]=} platforms Available OTT platforms.
 */

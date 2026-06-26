from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
import json
import os
import sys


ROOT = Path(__file__).resolve().parent
TMDB_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
LANGUAGE = os.getenv("TMDB_LANGUAGE", "ko-KR")
REGION = os.getenv("TMDB_REGION", "KR")


def load_dotenv():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"'))


load_dotenv()


def tmdb_credentials():
    return {
        "api_key": os.getenv("TMDB_API_KEY", "").strip(),
        "bearer": os.getenv("TMDB_BEARER_TOKEN", "").strip(),
    }


def has_tmdb_key():
    credentials = tmdb_credentials()
    return bool(credentials["api_key"] or credentials["bearer"])


def json_response(handler, payload, status=200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def tmdb_get(path, params=None):
    credentials = tmdb_credentials()
    params = dict(params or {})
    params.setdefault("language", LANGUAGE)
    if credentials["api_key"]:
        params["api_key"] = credentials["api_key"]

    url = f"{TMDB_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {"accept": "application/json"}
    if credentials["bearer"]:
        headers["Authorization"] = f"Bearer {credentials['bearer']}"

    request = Request(url, headers=headers)
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def poster_url(path):
    return f"{IMAGE_BASE}{path}" if path else ""


def korean_country(origin_countries):
    mapping = {
        "KR": "한국",
        "JP": "일본",
        "US": "미국",
        "GB": "영국",
        "DE": "독일",
        "FR": "프랑스",
        "CN": "중국",
        "TW": "대만",
    }
    if not origin_countries:
        return "기타"
    return mapping.get(origin_countries[0], origin_countries[0])


def service_name(provider_name):
    lowered = provider_name.lower()
    if "netflix" in lowered:
        return "Netflix"
    if "disney" in lowered:
        return "Disney+"
    if "watcha" in lowered:
        return "Watcha"
    if "tving" in lowered:
        return "TVING"
    if "wavve" in lowered:
        return "Wavve"
    return provider_name


def normalize_tmdb_item(item, media_type=None, detail=None):
    media_type = media_type or item.get("media_type")
    detail = detail or item
    is_movie = media_type == "movie"
    title = detail.get("title") if is_movie else detail.get("name")
    title = title or item.get("title") or item.get("name") or "제목 없음"
    release = detail.get("release_date") if is_movie else detail.get("first_air_date")
    year = int(release[:4]) if release and release[:4].isdigit() else 0
    genres = [genre.get("name") for genre in detail.get("genres", []) if genre.get("name")]
    translated_genres = [translate_genre(genre) for genre in genres]
    is_animation = "Animation" in genres or "애니메이션" in translated_genres
    item_type = "animation" if is_animation else ("movie" if is_movie else "series")
    credits = detail.get("credits", {})
    cast = [person.get("name") for person in credits.get("cast", [])[:3] if person.get("name")]
    crew = credits.get("crew", [])
    director = ""
    if is_movie:
        director = next((person.get("name") for person in crew if person.get("job") == "Director"), "")
    else:
        created_by = detail.get("created_by", [])
        director = created_by[0].get("name") if created_by else ""
        if not director:
            director = next((person.get("name") for person in crew if person.get("job") in ["Director", "Creator"]), "")

    providers = detail.get("watch/providers", {}).get("results", {}).get(REGION, {})
    ott = []
    for provider in providers.get("flatrate", [])[:5]:
        name = service_name(provider.get("provider_name", ""))
        if name and name not in ott:
            ott.append(name)

    keywords = []
    keyword_payload = detail.get("keywords", {})
    keyword_items = keyword_payload.get("keywords") or keyword_payload.get("results") or []
    for keyword in keyword_items[:8]:
        value = keyword.get("name")
        if value:
            keywords.append(value)
    keywords = [translate_keyword(value) for value in keywords]
    keywords = [*translated_genres, *keywords][:10]

    runtime = detail.get("runtime")
    if runtime is None:
        runtimes = detail.get("episode_run_time") or []
        runtime = runtimes[0] if runtimes else 0

    return {
        "tmdbId": detail.get("id") or item.get("id"),
        "title": title,
        "type": item_type,
        "year": year,
        "country": korean_country(detail.get("origin_country") or item.get("origin_country")),
        "genres": translated_genres or ["기타"],
        "director": director or "정보 없음",
        "actors": cast or ["정보 없음"],
        "rating": round(float(detail.get("vote_average") or item.get("vote_average") or 0), 1),
        "runtime": runtime or 0,
        "ott": ott or ["검색 필요"],
        "mood": infer_mood(translated_genres, keywords),
        "keywords": keywords or translated_genres or ["취향 분석"],
        "synopsis": detail.get("overview") or item.get("overview") or "줄거리 정보가 아직 없습니다.",
        "poster": poster_url(detail.get("poster_path") or item.get("poster_path")),
        "source": "tmdb",
    }


def translate_genre(genre):
    mapping = {
        "Action": "액션",
        "Adventure": "모험",
        "Animation": "애니메이션",
        "Comedy": "코미디",
        "Crime": "범죄",
        "Documentary": "다큐멘터리",
        "Drama": "드라마",
        "Family": "가족",
        "Fantasy": "판타지",
        "History": "역사",
        "Horror": "공포",
        "Music": "음악",
        "Mystery": "미스터리",
        "Romance": "로맨스",
        "Science Fiction": "SF",
        "Sci-Fi & Fantasy": "SF",
        "TV Movie": "TV 영화",
        "Thriller": "스릴러",
        "War": "전쟁",
        "Western": "서부",
        "Kids": "키즈",
    }
    return mapping.get(genre, genre)


def translate_keyword(keyword):
    mapping = {
        "time travel": "시간여행",
        "zombie": "좀비",
        "revenge": "복수",
        "friendship": "우정",
        "love": "사랑",
        "family": "가족",
        "survival": "생존",
        "space": "우주",
        "magic": "마법",
        "based on novel or book": "원작",
    }
    return mapping.get(keyword, keyword)


def infer_mood(genres, keywords):
    terms = set([*genres, *keywords])
    moods = []
    if terms & {"코미디", "모험", "가족", "우정"}:
        moods.append("light")
    if terms & {"스릴러", "공포", "범죄", "액션", "생존"}:
        moods.append("tense")
    if terms & {"SF", "미스터리", "시간여행", "원작"}:
        moods.append("brainy")
    if terms & {"드라마", "로맨스", "가족", "사랑"}:
        moods.append("moving")
    return moods or ["brainy"]


def search_tmdb(query):
    if not has_tmdb_key():
        return {
            "source": "fallback",
            "tmdbEnabled": False,
            "results": [],
            "message": "TMDb API key is not configured.",
        }

    payload = tmdb_get(
        "/search/multi",
        {
            "query": query,
            "include_adult": "false",
            "page": 1,
        },
    )
    results = []
    for item in payload.get("results", []):
        media_type = item.get("media_type")
        if media_type not in {"movie", "tv"}:
            continue
        try:
            detail = tmdb_get(
                f"/{media_type}/{item.get('id')}",
                {
                    "append_to_response": "credits,watch/providers,keywords",
                },
            )
            results.append(normalize_tmdb_item(item, media_type=media_type, detail=detail))
        except Exception:
            results.append(normalize_tmdb_item(item, media_type=media_type))
        if len(results) >= 8:
            break

    return {
        "source": "tmdb",
        "tmdbEnabled": True,
        "results": results,
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            json_response(
                self,
                {
                    "ok": True,
                    "tmdbEnabled": has_tmdb_key(),
                    "language": LANGUAGE,
                    "region": REGION,
                },
            )
            return

        if parsed.path == "/api/search":
            query = parse_qs(parsed.query).get("q", [""])[0].strip()
            if len(query) < 2:
                json_response(self, {"source": "empty", "tmdbEnabled": has_tmdb_key(), "results": []})
                return
            try:
                json_response(self, search_tmdb(query))
            except Exception as exc:
                json_response(
                    self,
                    {
                        "source": "error",
                        "tmdbEnabled": has_tmdb_key(),
                        "results": [],
                        "message": str(exc),
                    },
                    status=502,
                )
            return

        super().do_GET()


def main():
    port = int(os.getenv("PORT", "5173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"SceneSense backend running at http://127.0.0.1:{port}/")
    print(f"TMDb enabled: {has_tmdb_key()}")
    server.serve_forever()


if __name__ == "__main__":
    main()

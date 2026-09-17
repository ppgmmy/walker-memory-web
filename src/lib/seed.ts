import type { DatasetBundle, PlaceRecord } from "./types";

/** Compact Tuen Mun seed so deploy works without large JSON payloads. */
export const SEED_BUNDLE: DatasetBundle = {
  version: "1.0.0",
  updatedAt: "2026-09-17",
  merchants: [
    m("m_tm_plaza_mcd", "麥當勞 屯門市廣場", "屯門市中心", "新界屯門屯門鄉事會路 1 號屯門市廣場", "入市廣場後睇樓層搵快餐區；記低樓層同近邊間大舖", ["市廣場麥當勞"]),
    m("m_tm_plaza_kfc", "KFC 屯門市廣場", "屯門市中心", "新界屯門屯門鄉事會路 1 號屯門市廣場", "", ["肯德基 屯門市廣場"]),
    m("m_tm_town_cdc", "大家樂 屯門市廣場", "屯門市中心", "新界屯門屯門鄉事會路 1 號屯門市廣場", ""),
    m("m_tm_vcity_mcd", "麥當勞 V City", "屯門站", "新界屯門杯渡路 83 號 V City", "由屯門站／V City 入口入；記樓層同舖號", ["VCity麥當勞"]),
    m("m_tm_yoshinoya", "吉野家 屯門市廣場", "屯門市中心", "新界屯門屯門鄉事會路 1 號屯門市廣場", ""),
    m("m_tm_lung_mun", "龍門居商場食肆帶", "龍門", "新界屯門龍門路龍門居", "商場地舖為主；記清楚近邊座"),
    m("m_tm_siu_hong", "兆康苑商場一帶", "兆康", "新界屯門兆康苑", "輕鐵兆康站附近"),
    m("m_tm_san_hui", "新墟一帶食肆", "新墟", "新界屯門新墟", "街舖門牌亂；記招牌同街名"),
  ],
  residences: [
    r("r_tm_chile", "置樂花園", "置樂", "新界屯門置樂花園", "確認大閘（近屯門鄉事會路）；入閘後對座數字母再搵電梯", ["置樂", "Chi Lok Fa Yuen"]),
    r("r_tm_on_ting", "安定邨", "安定", "新界屯門安定邨", "跟行人指示牌對座名；唔好跟車路 GPS"),
    r("r_tm_yau_oi", "友愛邨", "友愛", "新界屯門友愛邨", "座數分散；先睇訂單座名再揀最近有蓋通道"),
    r("r_tm_tai_hing", "大興邨", "大興", "新界屯門大興邨", ""),
    r("r_tm_shan_king", "山景邨", "山景", "新界屯門山景邨", ""),
    r("r_tm_butterfly", "蝴蝶邨", "蝴蝶", "新界屯門蝴蝶邨", ""),
    r("r_tm_wu_king", "湖景邨", "湖景", "新界屯門湖景邨", ""),
    r("r_tm_leung_king", "良景邨", "良景", "新界屯門良景邨", ""),
    r("r_tm_tin_king", "田景邨", "田景", "新界屯門田景邨", ""),
    r("r_tm_kin_sang", "建生邨", "建生", "新界屯門建生邨", ""),
    r("r_tm_siu_hong", "兆康苑", "兆康", "新界屯門兆康苑", "確認座名同最近輕鐵／商場入口"),
    r("r_tm_lung_mun", "龍門居", "龍門", "新界屯門龍門路龍門居", "私人屋苑跟訪客閘；備註有寫用邊個門就跟"),
    r("r_tm_prime_view", "啟豐園", "新墟", "新界屯門啟豐園", ""),
    r("r_tm_sam_shing", "三聖邨", "三聖", "新界屯門三聖邨", ""),
    r("r_tm_melody", "悅湖山莊", "蝴蝶", "新界屯門悅湖山莊", ""),
    r("r_db", "愉景灣", "愉景灣", "新界大嶼山愉景灣", "離島；唔建議當步兵主力區", ["Discovery Bay", "DB"]),
  ],
};

function m(
  id: string,
  name: string,
  area: string,
  address: string,
  tip: string,
  aliases: string[] = [],
): PlaceRecord {
  return {
    id,
    kind: "merchant",
    name,
    nameAliases: aliases,
    district: "屯門",
    area,
    address,
    entranceTip: tip,
    status: "active",
    source: "seed",
    visits: 0,
    updatedAt: "2026-09-17",
  };
}

function r(
  id: string,
  name: string,
  area: string,
  address: string,
  tip: string,
  aliases: string[] = [],
): PlaceRecord {
  return {
    id,
    kind: "residence",
    name,
    nameAliases: aliases,
    district: area === "愉景灣" ? "離島" : "屯門",
    area,
    address,
    entranceTip: tip,
    status: "active",
    source: "seed",
    visits: 0,
    updatedAt: "2026-09-17",
  };
}

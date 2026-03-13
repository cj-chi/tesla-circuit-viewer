// 線材顏色對照表
export const WIRE_COLORS = {
  RD: { name: "紅", hex: "#E53935" },
  BU: { name: "藍", hex: "#1E88E5" },
  BK: { name: "黑", hex: "#212121" },
  WH: { name: "白", hex: "#BDBDBD" },
  GN: { name: "綠", hex: "#43A047" },
  YE: { name: "黃", hex: "#FDD835" },
  OG: { name: "橙", hex: "#FB8C00" },
  VT: { name: "紫", hex: "#8E24AA" },
  BN: { name: "棕", hex: "#795548" },
  GY: { name: "灰", hex: "#757575" },
}

// 接頭類型顏色
export const TYPE_COLORS = {
  controller: "#0ea5e9",
  passthrough: "#64748b",
  bus: "#f59e0b",
  amplifier: "#ef4444",
  speaker: "#22c55e",
}

// 接頭類型中文標籤
export const TYPE_LABELS = {
  controller: "控制器",
  passthrough: "直通",
  bus: "匯流排",
  amplifier: "功放",
  speaker: "揚聲器",
}

// 訊號分類標籤
export const CAT_LABELS = {
  analog: "類比音訊",
  A2B: "A2B 匯流排",
  amp_output: "功放輸出",
  power: "電源",
}

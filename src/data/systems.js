// 特斯拉音響系統定義
export const SYSTEMS = {
  base: {
    id: "base",
    name: "Audio, Base",
    sheet: "Sheet 2 of 45",
    condition: "BAUDIO",
    description:
      "基礎音響系統。MCU 透過類比輸出直接驅動 8 組揚聲器，無外部功放。A2B 匯流排僅用於 Overhead Console 麥克風通訊。",
  },
  premium: {
    id: "premium",
    name: "Audio, Premium",
    sheet: "Sheet 3-4 of 45",
    condition: "PAUDIO",
    description:
      "高階音響系統。MCU 透過 A2B-B 匯流排傳送數位音源至外部 Premium Amp，功放驅動前門低音、後門、後置物架及雙音圈重低音砲。MCU 仍直接驅動 IP 揚聲器、高音及行人警示。總計約 17-18 個揚聲器位置。",
  },
}

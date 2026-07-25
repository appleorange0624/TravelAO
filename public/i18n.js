export const LANG_STORAGE = "travelao_lang";

export const UI = {
  en: {
    planTrip: "Plan your trip",
    mode: "Planner mode",
    ai: "AI (OpenRouter)",
    research: "Web research",
    offline: "Offline (instant templates)",
    model: "AI model",
    relationship: "Relationship",
    groupSize: "Group size & ages",
    dates: "Dates",
    budget: "Budget",
    purpose: "Main purpose",
    destination: "Destination",
    optional: "optional",
    notes: "Extra notes",
    generate: "Generate plan",
    generating: "Generating…",
    yourPlan: "Your travel plan",
    copy: "Copy",
    print: "Print",
    copied: "Copied!",
    placeholderTitle: "Your itinerary will appear here",
    placeholderBody: "Pick a language above, fill in your trip, and get a visual plan with photos, booking links, and a day-by-day summary.",
    select: "Select…",
    couple: "Couple",
    friends: "Friends",
    family: "Family",
    watchVideos: "Watch before you go",
    videoSub: "Travel videos to preview your destination (opens YouTube)",
    dayMorning: "Morning",
    dayAfternoon: "Afternoon",
    dayEvening: "Evening",
    topPick: "Top pick for you",
    whyRecommend: "Why we recommend it",
    bookNow: "Book / reserve",
    moreInfo: "More info",
    openMaps: "Maps",
    daySummary: "Day-by-day summary",
  },
  zh: {
    planTrip: "规划您的行程",
    mode: "规划模式",
    ai: "AI（OpenRouter）",
    research: "网络搜索",
    offline: "离线（即时模板）",
    model: "AI 模型",
    relationship: "出行关系",
    groupSize: "人数与年龄",
    dates: "日期",
    budget: "预算",
    purpose: "主要目的",
    destination: "目的地",
    optional: "选填",
    notes: "补充说明",
    generate: "生成行程",
    generating: "生成中…",
    yourPlan: "您的旅行计划",
    copy: "复制",
    print: "打印",
    copied: "已复制！",
    placeholderTitle: "行程将显示在这里",
    placeholderBody: "选择语言，填写行程信息，即可获得含图片、预订链接和每日摘要的可视化计划。",
    select: "请选择…",
    couple: "情侣",
    friends: "朋友",
    family: "家庭",
    watchVideos: "出发前看看",
    videoSub: "预览目的地视频（打开 YouTube）",
    dayMorning: "上午",
    dayAfternoon: "下午",
    dayEvening: "晚上",
    topPick: "为您首选",
    whyRecommend: "推荐理由",
    bookNow: "预订",
    moreInfo: "更多信息",
    openMaps: "地图",
    daySummary: "每日行程摘要",
  },
};

export function getLang() {
  const saved = localStorage.getItem(LANG_STORAGE);
  return saved === "zh" ? "zh" : "en";
}

export function setLang(lang) {
  localStorage.setItem(LANG_STORAGE, lang === "zh" ? "zh" : "en");
}

export function t(key, lang = getLang()) {
  return UI[lang]?.[key] ?? UI.en[key] ?? key;
}

export function applyUiLang(lang) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key, lang);
    if (!val) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.placeholder) el.placeholder = val;
    } else if (el.tagName === "OPTION") {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

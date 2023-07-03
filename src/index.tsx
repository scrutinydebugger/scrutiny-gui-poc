import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { I18nextProvider } from "react-i18next";
import i18next, { Resource } from "i18next";
import common_en from "./translations/en/common.json";

import * as widgets from "./widgets";

const i18nextResources: Resource = {
  en: { common: common_en },
};

for (const widgetKey in widgets) {
  const widget = widgets[widgetKey as keyof typeof widgets];
  for (const lang in widget.meta.translations) {
    if (!(lang in i18nextResources)) i18nextResources[lang] = {};

    i18nextResources[lang][`widget:${widgetKey}`] =
      widget.meta.translations[lang];
  }
}

i18next.init({
  interpolation: { escapeValue: false }, // React already does escaping
  lng: "en",
  resources: i18nextResources,
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18next}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);

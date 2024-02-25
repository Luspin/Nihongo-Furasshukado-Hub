import {
    StandardLuminance,
    baseLayerLuminance,
    fillColor,
    allComponents,
    provideFluentDesignSystem
  } from "https://unpkg.com/@fluentui/web-components@2.0.0";

provideFluentDesignSystem()
  .register(allComponents);

const layer = document.querySelector("fluent-design-system-provider");
baseLayerLuminance.setValueFor(layer, StandardLuminance.DarkMode);

baseLayerLuminance.setValueFor((document.getElementById('flashcardContainer')), StandardLuminance.DarkMode);
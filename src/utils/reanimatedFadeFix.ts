// Utility to polyfill `.duration()` and `.delay()` on Reanimated transition objects
// Some production builds of Reanimated tree-shake these helpers out, which causes
// "undefined is not a function" crashes when code calls `FadeIn.duration(300)`.
// We defensively attach no-op chainable versions that just return the same object.

import { FadeIn, FadeOut, FlipInEasyY, FlipOutEasyY, SlideInUp, SlideInDown, SlideInLeft, SlideOutRight } from 'react-native-reanimated';

function patch(anim: any) {
  if (anim && typeof anim === 'object') {
    if (!anim.duration) {
      anim.duration = () => anim;
    }
    if (!anim.delay) {
      anim.delay = () => anim;
    }
    if (!anim.springify) {
      anim.springify = () => anim;
    }
  }
}

[FadeIn, FadeOut, FlipInEasyY, FlipOutEasyY, SlideInUp, SlideInDown, SlideInLeft, SlideOutRight].forEach(patch);

export {}; 
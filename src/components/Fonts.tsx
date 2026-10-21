import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// Only the three families from the brief: Aesthetic Monoline (supplied), and the closest matches to the
// "Æsthetics" serif (Bodoni Moda) and the "Anymore" display face (MuseoModerno).
const FACES: [string, string, FontFaceDescriptors][] = [
  ['MuseoModerno', 'fonts/MuseoModerno-VF.ttf', {weight: '100 900'}],
  ['MuseoModerno', 'fonts/MuseoModerno-Italic-VF.ttf', {weight: '100 900', style: 'italic'}],
  ['Bodoni Moda', 'fonts/BodoniModa-VF.ttf', {weight: '400 900'}],
  ['Bodoni Moda', 'fonts/BodoniModa-Italic-VF.ttf', {weight: '400 900', style: 'italic'}],
  ['Aesthetic Monoline', 'fonts/AestheticMonoline.ttf', {}],
];

let loaded: Promise<void> | null = null;
const loadAll = () => {
  loaded ??= Promise.all(
    FACES.map(async ([family, file, desc]) => {
      const face = new FontFace(family, `url(${staticFile(file)})`, desc);
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return loaded;
};

export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadAll().then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};

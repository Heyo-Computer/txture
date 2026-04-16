import { useEffect, useState } from "preact/hooks";
import { MeshGradient, Waves, DotOrbit } from "@paper-design/shaders-react";
import type { Theme } from "../types";

interface Props {
  theme: Theme;
}

export function ShaderBackground({ theme }: Props) {
  const bg = theme.background;
  const [visible, setVisible] = useState(
    typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    function onVis() { setVisible(document.visibilityState === "visible"); }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (bg.type === "solid") return null;

  const style = {
    position: "fixed" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    pointerEvents: "none" as const,
    opacity: theme.backgroundOpacity ?? 1,
  };
  const speed = visible ? 1 : 0;

  if (bg.type === "meshGradient") {
    return (
      <div class="shader-bg" style={style} aria-hidden>
        <MeshGradient
          style={{ width: "100%", height: "100%" }}
          colors={bg.colors}
          distortion={bg.distortion ?? 0.8}
          swirl={bg.swirl ?? 0.3}
          speed={(bg.speed ?? 0.3) * speed}
          grainOverlay={bg.grainOverlay ?? 0}
        />
      </div>
    );
  }

  if (bg.type === "waves") {
    return (
      <div class="shader-bg" style={style} aria-hidden>
        <Waves
          style={{ width: "100%", height: "100%" }}
          colorFront={bg.colorFront}
          colorBack={bg.colorBack}
          frequency={bg.frequency ?? 0.75}
          amplitude={bg.amplitude ?? 0.5}
          spacing={bg.spacing ?? 0.5}
          softness={bg.softness ?? 0.9}
          rotation={bg.rotation ?? 0}
        />
      </div>
    );
  }

  if (bg.type === "dotOrbit") {
    return (
      <div class="shader-bg" style={style} aria-hidden>
        <DotOrbit
          style={{ width: "100%", height: "100%" }}
          colorBack={bg.colorBack}
          colors={bg.colors}
          size={bg.size ?? 0.2}
          sizeRange={bg.sizeRange ?? 0.3}
          spreading={bg.spreading ?? 0.5}
          speed={(bg.speed ?? 0.7) * speed}
        />
      </div>
    );
  }

  return null;
}

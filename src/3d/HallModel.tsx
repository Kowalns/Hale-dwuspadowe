import React from 'react';
import { SideColumns } from './elements/SideColumns';
import { EndColumns } from './elements/EndColumns';
import { Rafter } from './elements/Rafter';
import { Truss } from './elements/Truss';
import { Purlins } from './elements/Purlins';
import { PurlinBracing } from './elements/PurlinBracing';
import { CrossBracing } from './elements/CrossBracing';
import type { HallParameters, CalculationResults } from '../types';

interface HallModelProps {
  params: HallParameters;
  results: CalculationResults;
}

/**
 * Main assembly component that renders the complete 3D structural model.
 * Origin centered for better camera viewing.
 * X = along building length, Y = up, Z = across building width (span)
 */
export const HallModel = React.memo(function HallModel({ params, results }: HallModelProps) {
  const { span, length: hallLength, wallHeight, roofAngle } = params;
  const {
    sideColumnProfile,
    endColumnProfile,
    rafterProfile,
    trussChordProfile,
    purlinProfile,
    bracingDiameter,
    columnSpacing,
    purlinSpacing,
    trussHeight,
    numberOfFrames,
    ridgeHeight,
  } = results;

  // Offset the model so it's roughly centered
  const offsetX = -hallLength / 2;
  const offsetZ = -span / 2;

  return (
    <group position={[offsetX, 0, offsetZ]}>
      <SideColumns
        profile={sideColumnProfile}
        wallHeight={wallHeight}
        span={span}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
      />

      <EndColumns
        profile={endColumnProfile}
        wallHeight={wallHeight}
        span={span}
        length={hallLength}
        ridgeHeight={ridgeHeight}
      />

      {rafterProfile && (
        <Rafter
          profile={rafterProfile}
          wallHeight={wallHeight}
          span={span}
          roofAngle={roofAngle}
          columnSpacing={columnSpacing}
          numberOfFrames={numberOfFrames}
        />
      )}

      {trussChordProfile && trussHeight != null && (
        <Truss
          chordProfile={trussChordProfile}
          wallHeight={wallHeight}
          span={span}
          roofAngle={roofAngle}
          trussHeight={trussHeight}
          columnSpacing={columnSpacing}
          numberOfFrames={numberOfFrames}
        />
      )}

      <Purlins
        profile={purlinProfile}
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        purlinSpacing={purlinSpacing}
        hallLength={hallLength}
      />

      <PurlinBracing
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        purlinSpacing={purlinSpacing}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
      />

      <CrossBracing
        wallHeight={wallHeight}
        span={span}
        ridgeHeight={ridgeHeight}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        hallLength={hallLength}
        bracingDiameter={bracingDiameter}
      />
    </group>
  );
});

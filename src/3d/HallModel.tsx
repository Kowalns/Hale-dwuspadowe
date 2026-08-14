import React from 'react';
import { SideColumns } from './elements/SideColumns';
import { EndColumns } from './elements/EndColumns';
import { Rafter } from './elements/Rafter';
import { Truss } from './elements/Truss';
import { Purlins } from './elements/Purlins';
import { PurlinBracing } from './elements/PurlinBracing';
import { CrossBracing } from './elements/CrossBracing';
import { BasePlates } from './elements/BasePlates';
import { EndPlates } from './elements/EndPlates';
import { RidgePlates } from './elements/RidgePlates';
import { EaveBeams } from './elements/EaveBeams';
import { WallGirts } from './elements/WallGirts';
import { GableGirts } from './elements/GableGirts';
import { IntermediateColumns } from './elements/IntermediateColumns';
import { TrussColumnHead } from './elements/TrussColumnHead';
import { ColumnCaps } from './elements/ColumnCaps';
import type { HallParameters, CalculationResults } from '../types';

interface HallModelProps {
  params: HallParameters;
  results: CalculationResults;
}

/**
 * Main assembly component that renders the complete 3D structural model.
 * Receives hall parameters and calculation results, composes all structural elements.
 * Origin is at bottom-left corner of building (X=0, Y=0, Z=0).
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
    connectionPlates,
    eaveBeamProfile,
    wallGirtProfile,
    gableGirtProfile,
    intermediateColumnProfile,
    intermediateColumnActive,
  } = results;

  // Offset the model so it's roughly centered for better camera viewing
  const offsetX = -hallLength / 2;
  const offsetZ = -span / 2;

  // Column flange offset: half the column profile width (b/2) in meters
  // This shifts rafters/trusses inward so they start at the inner flange surface
  const columnFlangeOffset = sideColumnProfile.b / 2 / 1000;

  return (
    <group position={[offsetX, 0, offsetZ]}>
      {/* Side columns along both long walls */}
      <SideColumns
        profile={sideColumnProfile}
        wallHeight={wallHeight}
        span={span}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
      />

      {/* Cap plates at the top of side columns */}
      <ColumnCaps
        sideColumnProfile={sideColumnProfile}
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
      />

      {/* End columns on gable ends */}
      <EndColumns
        profile={endColumnProfile}
        wallHeight={wallHeight}
        span={span}
        length={hallLength}
        ridgeHeight={ridgeHeight}
      />

      {/* Rafters or Trusses depending on span */}
      {rafterProfile && (
        <Rafter
          profile={rafterProfile}
          wallHeight={wallHeight}
          span={span}
          roofAngle={roofAngle}
          columnSpacing={columnSpacing}
          numberOfFrames={numberOfFrames}
          columnFlangeOffset={columnFlangeOffset}
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
          columnFlangeOffset={columnFlangeOffset}
        />
      )}

      {/* Purlins on both roof slopes */}
      <Purlins
        profile={purlinProfile}
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        purlinSpacing={purlinSpacing}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        hallLength={hallLength}
      />

      {/* Purlin bracing ties */}
      <PurlinBracing
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        purlinSpacing={purlinSpacing}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
      />

      {/* Cross bracing on walls and roof */}
      <CrossBracing
        wallHeight={wallHeight}
        span={span}
        roofAngle={roofAngle}
        ridgeHeight={ridgeHeight}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        hallLength={hallLength}
        bracingDiameter={bracingDiameter}
      />

      {/* Connection plates */}
      <BasePlates
        sideColumnProfile={sideColumnProfile}
        endColumnProfile={endColumnProfile}
        wallHeight={wallHeight}
        span={span}
        length={hallLength}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        ridgeHeight={ridgeHeight}
        connectionPlates={connectionPlates}
      />
      <EndPlates
        wallHeight={wallHeight}
        span={span}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        connectionPlates={connectionPlates}
        rafterType={rafterProfile ? 'ipe' : 'truss'}
      />
      <RidgePlates
        span={span}
        columnSpacing={columnSpacing}
        numberOfFrames={numberOfFrames}
        ridgeHeight={ridgeHeight}
        connectionPlates={connectionPlates}
      />

      {/* Truss column heads (only when truss is active) */}
      {trussChordProfile && trussHeight != null && (
        <TrussColumnHead
          chordProfile={trussChordProfile}
          wallHeight={wallHeight}
          span={span}
          roofAngle={roofAngle}
          trussHeight={trussHeight}
          columnSpacing={columnSpacing}
          numberOfFrames={numberOfFrames}
          connectionPlates={connectionPlates}
          columnFlangeOffset={columnFlangeOffset}
        />
      )}

      {/* Eave beams */}
      {eaveBeamProfile && (
        <EaveBeams
          profile={eaveBeamProfile}
          wallHeight={wallHeight}
          span={span}
          hallLength={hallLength}
        />
      )}

      {/* Wall girts on side walls */}
      {wallGirtProfile && (
        <WallGirts
          profile={wallGirtProfile}
          wallHeight={wallHeight}
          span={span}
          hallLength={hallLength}
        />
      )}

      {/* Gable girts on end walls */}
      {gableGirtProfile && (
        <GableGirts
          profile={gableGirtProfile}
          wallHeight={wallHeight}
          span={span}
          hallLength={hallLength}
        />
      )}

      {/* Intermediate columns on side walls */}
      {intermediateColumnProfile && (
        <IntermediateColumns
          profile={intermediateColumnProfile}
          wallHeight={wallHeight}
          span={span}
          columnSpacing={columnSpacing}
          numberOfFrames={numberOfFrames}
          active={intermediateColumnActive}
        />
      )}
    </group>
  );
});

/**
 * Avatar Component
 * Renders a gamified cartoon-style face avatar
 * Deterministically generated based on a unique ID
 *
 * Design follows brand guidelines with sports-themed aesthetic
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../styles';
import {
  FaceFeatures,
  generateFaceFeatures,
  generateFaceFeaturesWithAge,
  getFaceColors,
  getFaceShape,
  getHairStyle,
  getFacialHairStyle,
} from './FaceGenerator';

/**
 * Avatar size presets
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Avatar context - affects styling (e.g., player vs coach)
 */
export type AvatarContext = 'player' | 'coach' | 'prospect';

/**
 * Props for Avatar component
 */
export interface AvatarProps {
  /** Unique ID used to generate the face (player/coach ID) */
  id: string;
  /** Size preset */
  size?: AvatarSize;
  /** Age for age-influenced features */
  age?: number;
  /** Context affects background styling */
  context?: AvatarContext;
  /** Optional accent color (e.g., team color, position color) */
  accentColor?: string;
  /** Custom style override */
  style?: ViewStyle;
}

/**
 * Size configurations in pixels
 */
const SIZE_CONFIG: Record<AvatarSize, { container: number; face: number }> = {
  xs: { container: 32, face: 28 },
  sm: { container: 40, face: 34 },
  md: { container: 56, face: 48 },
  lg: { container: 80, face: 70 },
  xl: { container: 120, face: 105 },
};

/**
 * Render the hair shape based on style
 */
function HairLayer({
  features,
  faceSize,
  hairColor,
}: {
  features: FaceFeatures;
  faceSize: number;
  hairColor: string;
}): React.JSX.Element | null {
  const hairStyle = getHairStyle(features);

  if (!hairStyle.hasTop && !hairStyle.hasSides) {
    return null; // Bald
  }

  const topHeight = faceSize * hairStyle.topHeight;
  const sideWidth = faceSize * hairStyle.sideWidth;

  return (
    <View style={styles.hairContainer} pointerEvents="none">
      {/* Top hair */}
      {hairStyle.hasTop && topHeight > 0 && (
        <View
          style={[
            styles.hairTop,
            {
              backgroundColor: hairColor,
              width: faceSize * 0.85,
              height: topHeight,
              top: -topHeight * 0.5,
              borderTopLeftRadius: faceSize * 0.4,
              borderTopRightRadius: faceSize * 0.4,
            },
          ]}
        />
      )}
      {/* Side hair (left) */}
      {hairStyle.hasSides && sideWidth > 0 && (
        <View
          style={[
            styles.hairSide,
            {
              backgroundColor: hairColor,
              width: sideWidth,
              height: faceSize * 0.35,
              left: -sideWidth * 0.3,
              top: faceSize * 0.1,
            },
          ]}
        />
      )}
      {/* Side hair (right) */}
      {hairStyle.hasSides && sideWidth > 0 && (
        <View
          style={[
            styles.hairSide,
            {
              backgroundColor: hairColor,
              width: sideWidth,
              height: faceSize * 0.35,
              right: -sideWidth * 0.3,
              top: faceSize * 0.1,
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Render the eyes
 */
function Eyes({ faceSize }: { faceSize: number }): React.JSX.Element {
  const eyeSize = Math.max(faceSize * 0.12, 3);
  const eyeSpacing = faceSize * 0.25;
  const eyeY = faceSize * 0.35;

  return (
    <View
      style={[
        styles.eyesContainer,
        {
          top: eyeY,
          width: eyeSpacing * 2 + eyeSize,
        },
      ]}
    >
      {/* Left eye */}
      <View
        style={[
          styles.eye,
          {
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
          },
        ]}
      />
      {/* Right eye */}
      <View
        style={[
          styles.eye,
          {
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
          },
        ]}
      />
    </View>
  );
}

/**
 * Render the eyebrows
 */
function Eyebrows({
  faceSize,
  hairColor,
}: {
  faceSize: number;
  hairColor: string;
}): React.JSX.Element {
  const eyebrowWidth = faceSize * 0.15;
  const eyebrowHeight = Math.max(faceSize * 0.03, 2);
  const eyeSpacing = faceSize * 0.25;
  const eyebrowY = faceSize * 0.28;

  return (
    <View
      style={[
        styles.eyebrowsContainer,
        {
          top: eyebrowY,
          width: eyeSpacing * 2 + eyebrowWidth,
        },
      ]}
    >
      {/* Left eyebrow */}
      <View
        style={[
          styles.eyebrow,
          {
            backgroundColor: hairColor,
            width: eyebrowWidth,
            height: eyebrowHeight,
            borderRadius: eyebrowHeight,
          },
        ]}
      />
      {/* Right eyebrow */}
      <View
        style={[
          styles.eyebrow,
          {
            backgroundColor: hairColor,
            width: eyebrowWidth,
            height: eyebrowHeight,
            borderRadius: eyebrowHeight,
          },
        ]}
      />
    </View>
  );
}

/**
 * Render the nose
 */
function Nose({ faceSize, skinColor }: { faceSize: number; skinColor: string }): React.JSX.Element {
  const noseWidth = faceSize * 0.08;
  const noseHeight = faceSize * 0.12;
  const noseY = faceSize * 0.45;

  // Darken skin color slightly for nose shadow
  const noseShadow = adjustBrightness(skinColor, -20);

  return (
    <View
      style={[
        styles.nose,
        {
          top: noseY,
          width: noseWidth,
          height: noseHeight,
          borderRadius: noseWidth / 2,
          backgroundColor: noseShadow,
        },
      ]}
    />
  );
}

/**
 * Render the mouth
 */
function Mouth({ faceSize }: { faceSize: number }): React.JSX.Element {
  const mouthWidth = faceSize * 0.2;
  const mouthHeight = Math.max(faceSize * 0.03, 2);
  const mouthY = faceSize * 0.65;

  return (
    <View
      style={[
        styles.mouth,
        {
          top: mouthY,
          width: mouthWidth,
          height: mouthHeight,
          borderRadius: mouthHeight,
        },
      ]}
    />
  );
}

/**
 * Render facial hair (beard/stubble)
 */
function FacialHair({
  features,
  faceSize,
  hairColor,
}: {
  features: FaceFeatures;
  faceSize: number;
  hairColor: string;
}): React.JSX.Element | null {
  const facialHairStyle = getFacialHairStyle(features);

  if (facialHairStyle.name === 'none') {
    return null;
  }

  // Stubble is rendered as semi-transparent overlay
  if (facialHairStyle.stubble) {
    return (
      <View
        style={[
          styles.stubble,
          {
            top: faceSize * 0.55,
            width: faceSize * 0.6,
            height: faceSize * 0.35,
            borderBottomLeftRadius: faceSize * 0.25,
            borderBottomRightRadius: faceSize * 0.25,
            backgroundColor: `${hairColor}30`,
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  // Mustache
  const hasMustache = facialHairStyle.hasMustache;

  // Beard
  const hasBeard = facialHairStyle.hasBeard;
  const beardSize =
    'beardSize' in facialHairStyle ? (facialHairStyle.beardSize as string) : 'small';
  const beardHeight =
    beardSize === 'large'
      ? faceSize * 0.35
      : beardSize === 'medium'
        ? faceSize * 0.25
        : faceSize * 0.15;

  return (
    <View style={styles.facialHairContainer} pointerEvents="none">
      {/* Mustache */}
      {hasMustache && (
        <View
          style={[
            styles.mustache,
            {
              top: faceSize * 0.58,
              width: faceSize * 0.25,
              height: Math.max(faceSize * 0.05, 3),
              borderRadius: faceSize * 0.02,
              backgroundColor: hairColor,
            },
          ]}
        />
      )}
      {/* Beard */}
      {hasBeard && (
        <View
          style={[
            styles.beard,
            {
              top: faceSize * 0.65,
              width: faceSize * 0.45,
              height: beardHeight,
              borderBottomLeftRadius: faceSize * 0.2,
              borderBottomRightRadius: faceSize * 0.2,
              backgroundColor: hairColor,
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Render background ring with accent color
 */
function AccentRing({
  size,
  accentColor,
}: {
  size: number;
  accentColor: string;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.accentRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(size * 0.05, 2),
          borderColor: accentColor,
        },
      ]}
    />
  );
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Main Avatar component
 */
export function Avatar({
  id,
  size = 'md',
  age,
  context = 'player',
  accentColor,
  style,
}: AvatarProps): React.JSX.Element {
  // Generate face features deterministically
  const features: FaceFeatures = age
    ? generateFaceFeaturesWithAge(id, age)
    : generateFaceFeatures(id);

  const { skinColor, hairColor } = getFaceColors(features);
  const faceShape = getFaceShape(features);

  const { container: containerSize, face: faceSize } = SIZE_CONFIG[size];

  // Determine default accent color based on context
  const defaultAccent =
    context === 'coach' ? colors.secondary : context === 'prospect' ? colors.info : colors.primary;
  const ringColor = accentColor || defaultAccent;

  // Calculate face dimensions based on shape
  const faceWidth = faceSize * faceShape.widthRatio;
  const faceHeight = faceSize * faceShape.heightRatio;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
        },
        style,
      ]}
    >
      {/* Accent ring background */}
      <AccentRing size={containerSize} accentColor={ringColor} />

      {/* Face base */}
      <View
        style={[
          styles.face,
          {
            width: faceWidth,
            height: faceHeight,
            borderRadius: (faceSize * faceShape.borderRadius) / 100,
            backgroundColor: skinColor,
          },
        ]}
      >
        {/* Hair */}
        <HairLayer features={features} faceSize={faceSize} hairColor={hairColor} />

        {/* Eyebrows */}
        <Eyebrows faceSize={faceSize} hairColor={hairColor} />

        {/* Eyes */}
        <Eyes faceSize={faceSize} />

        {/* Nose */}
        <Nose faceSize={faceSize} skinColor={skinColor} />

        {/* Mouth */}
        <Mouth faceSize={faceSize} />

        {/* Facial hair */}
        <FacialHair features={features} faceSize={faceSize} hairColor={hairColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  accentRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  face: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  hairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hairTop: {
    position: 'absolute',
    alignSelf: 'center',
  },
  hairSide: {
    position: 'absolute',
    borderRadius: 4,
  },
  eyesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eye: {
    backgroundColor: '#1a1a1a',
  },
  eyebrowsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    opacity: 0.8,
  },
  nose: {
    position: 'absolute',
    alignSelf: 'center',
    opacity: 0.3,
  },
  mouth: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#8B4513',
    opacity: 0.6,
  },
  facialHairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  stubble: {
    position: 'absolute',
    alignSelf: 'center',
  },
  mustache: {
    position: 'absolute',
    alignSelf: 'center',
  },
  beard: {
    position: 'absolute',
    alignSelf: 'center',
  },
});

export default Avatar;

import React from 'react';
import { StyleSheet, View, ImageStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ZoomableImageProps {
  source: any;
  style?: StyleProp<ImageStyle>;
}

export function ZoomableImage({ source, style }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        panX.value = withSpring(0);
        panY.value = withSpring(0);
        savedPanX.value = 0;
        savedPanY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (scale.value > 1) {
        panX.value = savedPanX.value + e.translationX;
        panY.value = savedPanY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value === 1) {
        panX.value = withSpring(0);
        panY.value = withSpring(0);
        savedPanX.value = 0;
        savedPanY.value = 0;
      } else {
        savedPanX.value = panX.value;
        savedPanY.value = panY.value;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      const isZoomed = scale.value > 1;
      scale.value = withSpring(isZoomed ? 1 : 2);
      savedScale.value = isZoomed ? 1 : 2;
      
      panX.value = withSpring(0);
      panY.value = withSpring(0);
      savedPanX.value = 0;
      savedPanY.value = 0;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <Animated.Image 
          source={source} 
          style={[style, animatedStyle]} 
          resizeMode="contain" 
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

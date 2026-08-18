import React, { useState } from 'react';
import { StyleSheet, View, ImageStyle, StyleProp, Modal, Pressable, ImageResizeMode } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ZoomableImageProps {
  source: any;
  style?: StyleProp<ImageStyle>;
  showExpandIcon?: boolean;
  resizeMode?: ImageResizeMode;
}

export function ZoomableImage({ source, style, showExpandIcon = true, resizeMode = 'contain' }: ZoomableImageProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    panX.value = withSpring(0);
    panY.value = withSpring(0);
    savedPanX.value = 0;
    savedPanY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom();
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
        resetZoom();
      } else {
        savedPanX.value = panX.value;
        savedPanY.value = panY.value;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      const isZoomed = scale.value > 1;
      if (isZoomed) {
        resetZoom();
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      // Re-reset on JS thread after closing
      scale.value = 1;
      savedScale.value = 1;
      panX.value = 0;
      panY.value = 0;
      savedPanX.value = 0;
      savedPanY.value = 0;
    }, 300);
  };

  return (
    <>
      <Pressable onPress={() => setIsModalVisible(true)} style={styles.thumbnailContainer}>
        <Animated.Image 
          source={source} 
          style={style} 
          resizeMode={resizeMode} 
        />
        {showExpandIcon && (
          <View style={styles.expandIconContainer}>
            <Ionicons name="expand" size={20} color="white" />
          </View>
        )}
      </Pressable>

      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close-circle" size={36} color="white" />
          </Pressable>

          <GestureDetector gesture={composed}>
            <Animated.Image 
              source={source} 
              style={[styles.fullscreenImage, animatedStyle]} 
              resizeMode="contain" 
            />
          </GestureDetector>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbnailContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  expandIconContainer: {
    position: 'absolute',
    bottom: 32, // Adjusted assuming there's some margin in `style` usually
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});

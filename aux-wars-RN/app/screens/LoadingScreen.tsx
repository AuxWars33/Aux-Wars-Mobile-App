import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Image } from 'react-native';
import Rive from 'rive-react-native';

export default function LoadingScreen() {
  const [stage, setStage] = useState(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start scale animation with delay to show still image first
    Animated.sequence([
    //   Hold still for 500ms
      Animated.delay(1000),
      // Scale up to 160% AND rotate 50 degrees at the same time
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.70,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 135,
          duration: 250,
          useNativeDriver: true,
          
        }),
        Animated.delay(700),
      ]),
      // Scale back to 100% AND rotate back to 0 degrees at the same time
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Stage 1-3: Black background with ghost animation (2 seconds)
    const timer1 = setTimeout(() => {
      // Fade out black background and fade in light background
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStage(4);
      });
    }, 2000);

    return () => clearTimeout(timer1);
  }, [fadeAnim, logoFadeAnim, scaleAnim, rotateAnim]);

  return (
    <View style={styles.container}>
      {/* Stages 1-3: Black background with beanie animation */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          styles.darkBackground, 
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.content}>
          <Animated.Image
            source={require('../../assets/images/ghost_headphones.png')}
            style={[
              styles.ghostAnimation,
              {
                transform: [
                  {
                    scale: scaleAnim,
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: ['0deg', '50deg'],
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Stage 4: Light background with beanie + "Aux Wars" text */}
      {stage === 4 && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            styles.lightBackground,
            { opacity: logoFadeAnim }
          ]}
        >
          <View style={styles.finalContent}>
            <View style={styles.logoContainer}>
              <Rive
                resourceName="beanie_loading"
                style={styles.finalAnimation}
                autoplay={true}
              />
              <Text style={styles.finalTitle}>Aux Wars</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBackground: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightBackground: {
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  riveAnimation: {
    width: 200,
    height: 200,
  },
  ghostAnimation: {
    width: 100,
    height: 100,
  },
  finalContent: {
    flex: 1,
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 130,
    marginTop: -50,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // gap: 0,
    paddingLeft: 10,
  },
  finalAnimation: {
    width: 150,
    height: 150,
  },
  finalTitle: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
});


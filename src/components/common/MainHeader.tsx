import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../context/HeaderContext';

export const HEADER_HEIGHT = 60;

export const MainHeader: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { isVisible, isLoading, onPlusPress, onHeartPress } = useHeaderContext();

    const animatedValue = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isVisible ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    // Only the header content (below status bar) slides away
    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-HEADER_HEIGHT, 0],
    });

    return (
        <>
            {/* ── Persistent white stopper — always covers the status bar area ── */}
            <View
                style={[
                    styles.stopper,
                    { height: insets.top }
                ]}
                pointerEvents="none"
            />

            {/* ── Animated header content — slides up when hidden ── */}
            <Animated.View
                style={[
                    styles.wrapper,
                    {
                        top: insets.top,
                        transform: [{ translateY }]
                    }
                ]}
            >
                <View style={styles.container}>
                    <TouchableOpacity style={styles.iconButton} onPress={onPlusPress}>
                        <Ionicons name="add" size={28} color="#000" />
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/paltuu bilkul tight.svg')}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    </View>

                    <TouchableOpacity style={styles.iconButton} onPress={onHeartPress}>
                        <Ionicons name="heart-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Progress Bar Loader */}
                {isLoading && (
                    <View style={styles.loaderWrapper}>
                        <View style={styles.loaderBar} />
                    </View>
                )}
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    stopper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1001,           // above the header content
        backgroundColor: '#fff',
    },
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        height: HEADER_HEIGHT,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: HEADER_HEIGHT,
    },
    logoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 90,
        height: 30,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(160, 48, 72, 0.1)',
    },
    loaderBar: {
        height: '100%',
        width: '100%',
        backgroundColor: '#a03048',
    }
});

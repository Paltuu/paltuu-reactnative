import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext, HEADER_HEIGHT } from '../../context/HeaderContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useUploadStore } from '../../stores/uploadStore';

export { HEADER_HEIGHT };

interface MainHeaderProps {
    /** Owned by the caller (via `useHeaderScroll()`) — kept private per screen
     * so hiding this header via scroll never leaks into another screen's header. */
    headerTranslateY: SharedValue<number>;
}

export const MainHeader: React.FC<MainHeaderProps> = ({ headerTranslateY }) => {
    const insets = useSafeAreaInsets();
    const { isLoading, onPlusPress, onHeartPress } = useHeaderContext();
    const authReady = useAuthReady();
    const { isUploading, progress, stage, thumbnailUri } = useUploadStore();

    const { data: unreadData } = useQuery({
        queryKey: ['unread-count'],
        queryFn: () => notificationsApi.getUnreadCount(),
        staleTime: 5 * 60 * 1000,
        enabled: authReady,
    });

    const unreadCount = unreadData?.unread_count ?? 0;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: headerTranslateY.value }],
    }));

    return (
        <Animated.View style={[styles.wrapper, { top: insets.top }, animatedStyle]}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.iconButton} onPress={onPlusPress}>
                    <Image
                        source={require('../../../assets/icons/plus-solid.svg')}
                        style={{ width: 24, height: 24 }}
                        tintColor="#000000"
                    />
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/paltuu_bilkul_tight.svg')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </View>

                <TouchableOpacity style={styles.iconButton} onPress={onHeartPress}>
                    <View style={{ position: 'relative' }}>
                        <Image
                            source={require('../../../assets/icons/heart-unselect.svg')}
                            style={{ width: 24, height: 24 }}
                            tintColor="#000000"
                        />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {isLoading && (
                <View style={styles.loaderWrapper}>
                    <View style={styles.loaderBar} />
                </View>
            )}

            {isUploading && (
                <View style={styles.uploadProgressContainer}>
                    {thumbnailUri && (
                        <Image source={{ uri: thumbnailUri }} style={styles.uploadThumbnail} contentFit="cover" />
                    )}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[
                                styles.uploadText,
                                stage === 'success' && { color: '#10B981' },
                                stage === 'error' && { color: '#EF4444' }
                            ]} numberOfLines={1}>
                                {stage === 'preparing' && 'Preparing post...'}
                                {stage === 'uploading' && `Uploading... ${Math.round(progress * 100)}%`}
                                {stage === 'finalizing' && 'Finalizing...'}
                                {stage === 'success' && 'Your post is live!'}
                                {stage === 'error' && 'Post failed. Please try again.'}
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[
                                styles.progressBarFill,
                                { width: `${Math.round(progress * 100)}%` },
                                stage === 'success' && { backgroundColor: '#10B981', width: '100%' },
                                stage === 'error' && { backgroundColor: '#EF4444', width: '100%' }
                            ]} />
                        </View>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
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
        paddingHorizontal: 14,
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
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#a03048',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '700',
        lineHeight: 10,
    },
    uploadProgressContainer: {
        position: 'absolute',
        top: HEADER_HEIGHT,
        left: 0,
        right: 0,
        height: 48,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    uploadThumbnail: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
    },
    uploadText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
        fontFamily: 'Montserrat_600SemiBold',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#a03048',
        borderRadius: 2,
    },
});


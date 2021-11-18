import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native/lib/LottieView';
import { StyleSheet, View, Dimensions } from 'react-native';
import {
	PanGestureHandler,
	NativeViewGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
	Extrapolate,
	interpolate,
	runOnJS,
	useAnimatedGestureHandler,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

const { height } = Dimensions.get('screen');

const RefreshableWrapper = ({
	isLoading,
	refreshHeight = height * 0.5,
	onRefresh,
	children,
	Loader = () => (
		<LottieView
			style={styles.lottie}
			autoPlay
			source={require('./refresh.json')}
		/>
	),
}) => {
	const panRef = useRef();
	const listWrapperRef = useRef();
	const isRefreshing = useSharedValue(false);
	const loaderOffsetY = useSharedValue(0);
	const listContentOffsetY = useSharedValue(0);
	const isLoaderActive = useSharedValue(false);

	useEffect(() => {
		if (!isLoading) {
			loaderOffsetY.value = withTiming(0);
			isRefreshing.value = withTiming(false);
			isLoaderActive.value = false;
		}
	}, [isLoading]);

	const onListScroll = useAnimatedScrollHandler((event) => {
		listContentOffsetY.value = event.contentOffset.y;
	});

	const onPanGestureEvent = useAnimatedGestureHandler({
		onStart: (_) => {},
		onActive: (event, _) => {
			isLoaderActive.value = loaderOffsetY.value > 0;

			if (
				((listContentOffsetY.value <= 0 && event.velocityY >= 0) ||
					isLoaderActive.value) &&
				!isRefreshing.value
			) {
				loaderOffsetY.value = event.translationY;
			}
		},
		onEnd: (_) => {
			if (!isRefreshing.value) {
				if (loaderOffsetY.value >= refreshHeight && !isRefreshing.value) {
					isRefreshing.value = true;
					runOnJS(onRefresh)();
				} else {
					isLoaderActive.value = false;
					loaderOffsetY.value = withTiming(0);
				}
			}
		},
	});

	const loaderAnimation = useAnimatedStyle(() => {
		return {
			position: 'absolute',
			alignSelf: 'center',
			opacity: isLoaderActive.value
				? isRefreshing.value
					? withTiming(1)
					: interpolate(loaderOffsetY.value, [0, refreshHeight], [0.1, 0.5])
				: withTiming(0.1),
			transform: [
				{
					translateY: isLoaderActive.value
						? interpolate(
								loaderOffsetY.value,
								[0, refreshHeight - 50],
								[-10, 10],
								Extrapolate.CLAMP
						  )
						: withTiming(-10),
				},
				{
					scale: isLoaderActive.value ? withSpring(1) : withTiming(0.01),
				},
			],
		};
	});

	const overscrollAnimation = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateY: isLoaderActive.value
						? isRefreshing.value
							? withTiming(50)
							: interpolate(
									loaderOffsetY.value,
									[0, refreshHeight],
									[0, 80],
									Extrapolate.CLAMP
							  )
						: withTiming(0),
				},
			],
		};
	});

	return (
		<View style={styles.FlexView}>
			<PanGestureHandler
				ref={panRef}
				simultaneousHandlers={listWrapperRef}
				onGestureEvent={onPanGestureEvent}
			>
				<Animated.View style={[styles.FlexView, overscrollAnimation]}>
					<NativeViewGestureHandler
						ref={listWrapperRef}
						simultaneousHandlers={panRef}
					>
						{React.cloneElement(children, {
							onScroll: onListScroll,
							bounces: false,
						})}
					</NativeViewGestureHandler>
				</Animated.View>
			</PanGestureHandler>
			<Animated.View style={[loaderAnimation]}>
				<Loader />
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	FlexView: {
		flex: 1,
	},
	contenContainer: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		paddingBottom: 100,
	},
	lottie: {
		height: 50,
		width: 50,
	},
});

export default RefreshableWrapper;

RefreshableWrapper.propTypes = {
	isLoading: PropTypes.bool,
	refreshHeight: PropTypes.number,
	onRefresh: PropTypes.func,
	Loader: PropTypes.func,
	EmptyComponent: PropTypes.func,
};

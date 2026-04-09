// mobile-app/components/Wheel.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText, G } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cancelAnimation } from 'react-native-reanimated';

interface WheelItem {
    id: string;
    name: string;
    occurrences: number;
    active: boolean;
}

interface WheelProps {
    items: WheelItem[];
    probabilities: number[];
    disabled: boolean; // <-- NEW
    onSpinAttempt: () => Promise<boolean>; // <-- NEW
    onSpinEnd: (winner: WheelItem) => void;
}

// ... polarToCartesian and describeArc helpers are unchanged ...
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
};
const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${x} ${y} L ${start.x} ${start.y}`;
};


const WHEEL_SIZE = 300;
const RADIUS = WHEEL_SIZE / 2;
const COLORS = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#BD10E0', '#9013FE', '#7ED321'];

export default function Wheel({ items, probabilities, disabled, onSpinAttempt, onSpinEnd }: WheelProps) {
    const holdProgress = useSharedValue(0);
    const rotation = useSharedValue(0);
    const isSpinning = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    // Change to async function
    const spin = async () => {
        // Stop if already spinning, not enough items, OR globally disabled
        if (isSpinning.value || items.length < 2 || disabled) return;

        // Ask backend for permission!
        const canSpin = await onSpinAttempt();
        if (!canSpin) return;

        isSpinning.value = true;

        const randomSpins = Math.floor(Math.random() * 5) + 8;
        const randomExtraAngle = Math.random() * 360;
        const targetRotation = rotation.value + randomSpins * 360 + randomExtraAngle;

        rotation.value = withTiming(
            targetRotation,
            { duration: 6000, easing: Easing.out(Easing.cubic) },
            (finished) => {
                if (finished) {
                    const finalRotation = targetRotation % 360;
                    const winningAngle = (360 - finalRotation) % 360;

                    let cumulativeAngle = 0;
                    let winnerIndex = -1;

                    for (let i = 0; i < probabilities.length; i++) {
                        const sectorAngle = probabilities[i] * 360;
                        if (winningAngle >= cumulativeAngle && winningAngle < cumulativeAngle + sectorAngle) {
                            winnerIndex = i;
                            break;
                        }
                        cumulativeAngle += sectorAngle;
                    }

                    if (winnerIndex !== -1) {
                        runOnJS(onSpinEnd)(items[winnerIndex]);
                    }
                    isSpinning.value = false;
                }
            },
        );
    };
    const progressStyle = useAnimatedStyle(() => {
        const isFullyCharged = holdProgress.value >= 0.99;

        return {
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 6,
            width: `${holdProgress.value * 100}%`,
            backgroundColor: isFullyCharged ? '#50E3C2' : '#E53E3E',
        };
    });

    const longPress = Gesture.LongPress()
        .minDuration(1500)
        .maxDistance(15)
        .onBegin(() => {
            if (disabled) return;
            cancelAnimation(holdProgress);
            holdProgress.value = 0;
            // Use Easing.linear so the bar fills smoothly and consistently
            holdProgress.value = withTiming(1, { duration: 1500, easing: Easing.linear });
        })
        .onEnd((_e, success) => {
            if (success && !disabled) {
                runOnJS(spin)();
            }
        })
        .onFinalize(() => {
            cancelAnimation(holdProgress);
            holdProgress.value = 0;
        });

    let cumulativeAngle = 0;

    return (
        <View style={[styles.container, disabled && { opacity: 0.5 }]}>
            <View style={styles.pointer} />
            <GestureDetector gesture={longPress}>
                {/* 1. Add a stationary wrapper View here */}
                <View>
                    <Animated.View style={animatedStyle} collapsable={false}>
                        <Svg height={WHEEL_SIZE} width={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                            <G>
                                {items.map((item, index) => {
                                    const sectorAngle = probabilities[index] * 360;
                                    const startAngle = cumulativeAngle;
                                    const endAngle = startAngle + sectorAngle;
                                    const midAngle = startAngle + sectorAngle / 2;
                                    const textPos = polarToCartesian(RADIUS, RADIUS, RADIUS * 0.6, midAngle);

                                    cumulativeAngle = endAngle;

                                    return (
                                        <G key={item.id}>
                                            <Path
                                                d={describeArc(RADIUS, RADIUS, RADIUS, startAngle, endAngle)}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                            <SvgText
                                                x={textPos.x}
                                                y={textPos.y}
                                                fill="white"
                                                fontSize="14"
                                                fontWeight="bold"
                                                textAnchor="middle"
                                                transform={`rotate(${midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                                            >
                                                {item.name + ": " + item.occurrences}
                                            </SvgText>
                                        </G>
                                    );
                                })}
                            </G>
                        </Svg>
                    </Animated.View>

                    {/* 2. Move the Progress bar HERE (Outside the rotating view) */}
                    <Animated.View style={progressStyle} />
                </View>
            </GestureDetector>
        </View>
    );
}

// Styles are unchanged
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 30,
    },
    pointer: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderTopWidth: 30,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#E53E3E',
        position: 'absolute',
        top: -5,
        zIndex: 10,
    },
});
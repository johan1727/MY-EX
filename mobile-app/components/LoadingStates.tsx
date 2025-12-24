import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react-native';

// Reusable Loading States Component
// Provides consistent loading, success, and error states across the app

interface LoadingStateProps {
    type: 'loading' | 'success' | 'error';
    title: string;
    subtitle?: string;
    progress?: number; // 0-100 for progress bar
    phases?: string[]; // Array of phase labels
    currentPhase?: number; // Current phase index (0-based)
}

export function LoadingState({
    type,
    title,
    subtitle,
    progress,
    phases,
    currentPhase
}: LoadingStateProps) {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <View className="w-20 h-20 rounded-full bg-green-500/20 items-center justify-center">
                        <CheckCircle size={48} color="#22c55e" />
                    </View>
                );
            case 'error':
                return (
                    <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center">
                        <AlertCircle size={48} color="#ef4444" />
                    </View>
                );
            default:
                return (
                    <View className="w-24 h-24 rounded-full bg-purple-500/20 items-center justify-center">
                        <ActivityIndicator size="large" color="#a855f7" />
                    </View>
                );
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            default: return 'text-white';
        }
    };

    return (
        <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-8">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="absolute inset-0"
            />

            <View className="mb-8">
                {getIcon()}
            </View>

            <Text className={`text-2xl font-bold text-center mb-2 ${getTitleColor()}`}>
                {title}
            </Text>

            {subtitle && (
                <Text className="text-gray-400 text-center text-lg mb-8">
                    {subtitle}
                </Text>
            )}

            {/* Progress Bar */}
            {progress !== undefined && type === 'loading' && (
                <View className="w-full mb-4">
                    <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </View>
                </View>
            )}

            {/* Phase Indicators */}
            {phases && phases.length > 0 && (
                <View className="flex-row justify-between w-full px-2">
                    {phases.map((phase, index) => (
                        <Text
                            key={index}
                            className={`text-xs ${currentPhase === index
                                    ? 'text-purple-400'
                                    : currentPhase !== undefined && index < currentPhase
                                        ? 'text-green-400'
                                        : 'text-gray-500'
                                }`}
                        >
                            {phase}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
}

// Skeleton Loader for content placeholders
interface SkeletonProps {
    width?: string | number;
    height?: number;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    className?: string;
}

export function Skeleton({
    width = '100%',
    height = 16,
    rounded = 'md',
    className = ''
}: SkeletonProps) {
    const roundedClass = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full'
    }[rounded];

    return (
        <View
            className={`bg-white/10 animate-pulse ${roundedClass} ${className}`}
            style={{
                width: typeof width === 'number' ? width : width,
                height
            }}
        />
    );
}

// Card Skeleton for loading cards
export function CardSkeleton() {
    return (
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center">
                <Skeleton width={48} height={48} rounded="full" />
                <View className="flex-1 ml-3">
                    <Skeleton width="60%" height={20} className="mb-2" />
                    <Skeleton width="80%" height={14} />
                </View>
            </View>
        </View>
    );
}

// Message Skeleton for chat loading
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <View className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <View
                className={`max-w-[80%] ${isUser ? 'bg-purple-500/20' : 'bg-white/5'} rounded-2xl p-4`}
            >
                <Skeleton width="100%" height={16} className="mb-2" />
                <Skeleton width="70%" height={16} />
            </View>
        </View>
    );
}

// Full Page Loader
interface FullPageLoaderProps {
    message?: string;
}

export function FullPageLoader({ message = 'Cargando...' }: FullPageLoaderProps) {
    return (
        <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="absolute inset-0"
            />
            <ActivityIndicator size="large" color="#a855f7" />
            <Text className="text-gray-400 mt-4">{message}</Text>
        </View>
    );
}

// Inline Loader for buttons
export function ButtonLoader({ color = 'white' }: { color?: string }) {
    return <ActivityIndicator size="small" color={color} />;
}

// Typing Indicator for chat
export function TypingIndicator({ name = 'Coach' }: { name?: string }) {
    return (
        <View className="px-5 py-3">
            <View className="bg-white/5 rounded-2xl px-4 py-3 self-start max-w-[80%]">
                <Text className="text-gray-400 text-sm mb-1">{name} está escribiendo...</Text>
                <View className="flex-row gap-1">
                    <View className="w-2 h-2 bg-purple-500 rounded-full" />
                    <View className="w-2 h-2 bg-purple-400 rounded-full opacity-75" />
                    <View className="w-2 h-2 bg-purple-300 rounded-full opacity-50" />
                </View>
            </View>
        </View>
    );
}

export default {
    LoadingState,
    Skeleton,
    CardSkeleton,
    MessageSkeleton,
    FullPageLoader,
    ButtonLoader,
    TypingIndicator
};

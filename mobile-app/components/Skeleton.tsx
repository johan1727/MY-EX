import React from 'react';
import { View } from 'react-native';

interface SkeletonProps {
    width?: string;
    height?: string | number;
    className?: string;
}

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: SkeletonProps) {
    return (
        <View className={`bg-gray-700/20 rounded-lg ${height} ${width} ${className}`}
            style={{ opacity: 0.6 }} />
    );
}

export function SkeletonCircle({ size = 'w-12 h-12', className = '' }: { size?: string, className?: string }) {
    return (
        <View className={`bg-gray-700/20 rounded-full ${size} ${className}`}
            style={{ opacity: 0.6 }} />
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <View className={`bg-[#2a2b32] border border-gray-700 rounded-2xl p-4 ${className}`}>
            <SkeletonLine width="w-3/4" className="mb-2" />
            <SkeletonLine width="w-1/2" height="h-3" className="mb-3" />
            <SkeletonLine width="w-full" height="h-3" />
        </View>
    );
}

export function ChatMessageSkeleton() {
    return (
        <View className="px-4 py-3">
            <View className="flex-row items-start">
                <SkeletonCircle size="w-8 h-8" className="mr-3" />
                <View className="flex-1">
                    <SkeletonLine width="w-full" className="mb-2" />
                    <SkeletonLine width="w-4/5" className="mb-2" />
                    <SkeletonLine width="w-3/5" />
                </View>
            </View>
        </View>
    );
}

export function ProfileSkeleton() {
    return (
        <View className="px-6">
            <View className="bg-[#2a2b32] border border-gray-700 rounded-2xl p-6 mb-6">
                <View className="items-center mb-6">
                    <SkeletonCircle size="w-20 h-20" className="mb-4" />
                    <SkeletonLine width="w-48" className="mb-2" />
                </View>
                <View className="flex-row justify-around border-t border-gray-700 pt-4">
                    <View className="items-center">
                        <SkeletonCircle size="w-12 h-12" className="mb-2" />
                        <SkeletonLine width="w-16" height="h-6" className="mb-1" />
                        <SkeletonLine width="w-20" height="h-3" />
                    </View>
                    <View className="items-center">
                        <SkeletonCircle size="w-12 h-12" className="mb-2" />
                        <SkeletonLine width="w-16" height="h-6" className="mb-1" />
                        <SkeletonLine width="w-20" height="h-3" />
                    </View>
                </View>
            </View>
        </View>
    );
}

export function ExSimulatorListSkeleton() {
    return (
        <View className="px-4">
            {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="mb-3" />
            ))}
        </View>
    );
}

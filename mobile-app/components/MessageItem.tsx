import React from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

type Message = {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    created_at: string;
    image?: string;
};

interface MessageItemProps {
    item: Message;
}

export default function MessageItem({ item }: MessageItemProps) {
    const isUser = item.sender === 'user';

    return (
        <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-5 px-5`}>
            {!isUser && (
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3 self-start mt-1">
                    <LinearGradient
                        colors={['#a855f7', '#3b82f6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="w-full h-full rounded-full items-center justify-center"
                        style={{
                            shadowColor: '#a855f7',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 10,
                        }}
                    >
                        <Sparkles size={20} color="white" />
                    </LinearGradient>
                </View>
            )}
            <View className={`max-w-[75%]`}>
                <View
                    className={`px-5 py-4 ${isUser
                        ? 'rounded-[24px] rounded-br-[4px]'
                        : 'rounded-[24px] rounded-bl-[4px]'
                        }`}
                    style={{
                        backgroundColor: isUser ? undefined : 'rgba(255, 255, 255, 0.05)',
                        borderWidth: isUser ? 0 : 1,
                        borderColor: isUser ? undefined : 'rgba(255, 255, 255, 0.1)',
                        shadowColor: isUser ? '#3b82f6' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isUser ? 0.4 : 0,
                        shadowRadius: 12,
                    }}
                >
                    {isUser && (
                        <LinearGradient
                            colors={['#3b82f6', '#8b5cf6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="absolute inset-0 rounded-[24px] rounded-br-[4px]"
                        />
                    )}
                    <View style={{ position: 'relative', zIndex: 1 }}>
                        {item.image && (
                            <Image
                                source={{ uri: item.image }}
                                className="w-full h-60 rounded-2xl mb-3"
                                resizeMode="cover"
                            />
                        )}
                        {item.content ? (
                            <Text className={`text-[15px] leading-6 ${isUser ? 'text-white font-semibold' : 'text-gray-100'}`}>
                                {item.content}
                            </Text>
                        ) : null}
                    </View>
                </View>
                <Text className={`text-[10px] text-gray-500 mt-1.5 ${isUser ? 'text-right mr-1' : 'text-left ml-1'}`}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
}

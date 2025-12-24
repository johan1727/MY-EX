import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import MessageActions from './MessageActions';

type Message = {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    created_at: string;
    image?: string;
};

interface MessageItemProps {
    item: Message;
    onEdit?: (newContent: string) => void;
    onRegenerate?: () => void;
    onDelete?: () => void;
}

export default function MessageItem({ item, onEdit, onRegenerate, onDelete }: MessageItemProps) {
    const isUser = item.sender === 'user';
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(item.content);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleSaveEdit = () => {
        if (onEdit && editContent.trim() !== item.content) {
            onEdit(editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(item.content);
        setIsEditing(false);
    };

    const markdownStyles = {
        body: {
            color: isUser ? '#ffffff' : '#e5e7eb',
            fontSize: 16,
            lineHeight: 24,
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 8,
        },
        strong: {
            fontWeight: '600' as '600',
            color: isUser ? '#ffffff' : '#ffffff',
        },
        em: {
            fontStyle: 'italic' as 'italic',
        },
        code_inline: {
            backgroundColor: isUser ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isUser ? '#ffffff' : '#c4b5fd',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 14,
        },
        code_block: {
            backgroundColor: isUser ? 'rgba(0, 0, 0, 0.3)' : '#1a1a1a',
            padding: 12,
            borderRadius: 8,
            marginVertical: 8,
        },
    };

    const formatTime = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    return (
        <Animated.View
            style={{ opacity: fadeAnim }}
            className={`px-4 mb-4 ${isUser ? 'items-end' : 'items-start'}`}
        >
            <View className={`flex-row ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[85%]`}>
                {/* AI Avatar */}
                {!isUser && (
                    <View className="w-8 h-8 bg-purple-600/20 rounded-full items-center justify-center mr-3 mt-1">
                        <Sparkles size={16} color="#a855f7" />
                    </View>
                )}

                {/* Message Bubble */}
                <View className="flex-1">
                    {isUser ? (
                        // User Message - Gradient
                        <LinearGradient
                            colors={['#9333ea', '#ec4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className={`rounded-2xl px-4 py-3 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                        >
                            {item.image && (
                                <Image
                                    source={{ uri: item.image }}
                                    className="w-full h-48 rounded-xl mb-3"
                                    resizeMode="cover"
                                />
                            )}

                            {isEditing ? (
                                <View>
                                    <TextInput
                                        value={editContent}
                                        onChangeText={setEditContent}
                                        multiline
                                        className="text-white text-base leading-6 p-0 min-h-[60px]"
                                        autoFocus
                                        style={{ outlineStyle: 'none' } as any}
                                    />
                                    <View className="flex-row justify-end mt-2 gap-2">
                                        <TouchableOpacity
                                            onPress={handleCancelEdit}
                                            className="bg-white/20 p-2 rounded-lg active:bg-white/30"
                                        >
                                            <X size={16} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleSaveEdit}
                                            className="bg-white/30 p-2 rounded-lg active:bg-white/40"
                                        >
                                            <Check size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    {item.content ? (
                                        <Markdown style={markdownStyles}>
                                            {item.content}
                                        </Markdown>
                                    ) : null}
                                </View>
                            )}

                            {!isEditing && (
                                <Text className="text-white/70 text-xs mt-1">
                                    {formatTime(item.created_at)}
                                </Text>
                            )}
                        </LinearGradient>
                    ) : (
                        // AI Message - Gray
                        <View className={`bg-[#2a2b32] rounded-2xl px-4 py-3 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                            {item.image && (
                                <Image
                                    source={{ uri: item.image }}
                                    className="w-full h-48 rounded-xl mb-3"
                                    resizeMode="cover"
                                />
                            )}

                            {item.content ? (
                                <Markdown style={markdownStyles}>
                                    {item.content}
                                </Markdown>
                            ) : null}

                            <View className="flex-row items-center justify-between mt-1">
                                <Text className="text-gray-500 text-xs">
                                    {formatTime(item.created_at)}
                                </Text>
                                <MessageActions
                                    isUser={isUser}
                                    content={item.content}
                                    onEdit={onEdit ? () => setIsEditing(true) : undefined}
                                    onRegenerate={onRegenerate}
                                    onDelete={onDelete}
                                />
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

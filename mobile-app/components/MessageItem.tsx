import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
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
            color: '#ececec',
            fontSize: 15,
            lineHeight: 24,
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 8,
        },
        strong: {
            fontWeight: '600' as '600',
            color: '#ffffff',
        },
        em: {
            fontStyle: 'italic' as 'italic',
        },
        code_inline: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#a78bfa',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 14,
        },
        code_block: {
            backgroundColor: '#000000',
            padding: 12,
            borderRadius: 8,
            marginVertical: 8,
        },
        fence: {
            backgroundColor: '#000000',
            padding: 12,
            borderRadius: 8,
            marginVertical: 8,
        },
        bullet_list: {
            marginVertical: 4,
        },
        ordered_list: {
            marginVertical: 4,
        },
        list_item: {
            marginVertical: 2,
        },
    };

    return (
        <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-5`}>
            {!isUser && (
                <View className="w-8 h-8 rounded-full bg-purple-600 items-center justify-center mr-3 self-start mt-1">
                    <Sparkles size={16} color="white" />
                </View>
            )}
            <View className={`max-w-[80%]`}>
                <View
                    className={`px-4 py-3 rounded-2xl ${isUser
                            ? 'bg-[#2f2f2f]'
                            : 'bg-transparent'
                        }`}
                >
                    <View>
                        {item.image && (
                            <Image
                                source={{ uri: item.image }}
                                className="w-full h-60 rounded-xl mb-3"
                                resizeMode="cover"
                            />
                        )}

                        {isEditing ? (
                            <View>
                                <TextInput
                                    value={editContent}
                                    onChangeText={setEditContent}
                                    multiline
                                    className="text-white text-[15px] leading-6 p-0 min-h-[60px]"
                                    autoFocus
                                    style={{ outlineStyle: 'none' } as any}
                                />
                                <View className="flex-row justify-end mt-2 gap-2">
                                    <TouchableOpacity onPress={handleCancelEdit} className="bg-white/10 p-2 rounded-lg">
                                        <X size={16} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSaveEdit} className="bg-white/20 p-2 rounded-lg">
                                        <Check size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            item.content ? (
                                <Markdown style={markdownStyles}>
                                    {item.content}
                                </Markdown>
                            ) : null
                        )}
                    </View>
                </View>

                {/* Actions and Timestamp */}
                <View className={`flex-row items-center justify-between mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <Text className="text-[11px] text-gray-500">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    {!isEditing && (
                        <MessageActions
                            isUser={isUser}
                            content={item.content}
                            onEdit={onEdit ? () => setIsEditing(true) : undefined}
                            onRegenerate={onRegenerate}
                            onDelete={onDelete}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

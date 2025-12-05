import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Copy, Edit2, RefreshCw, Trash2, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface MessageActionsProps {
    isUser: boolean;
    content: string;
    onEdit?: () => void;
    onRegenerate?: () => void;
    onDelete?: () => void;
}

export default function MessageActions({
    isUser,
    content,
    onEdit,
    onRegenerate,
    onDelete
}: MessageActionsProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <View className={`flex-row items-center mt-1.5 ${isUser ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100`}>
            <TouchableOpacity onPress={handleCopy} className="p-1 mr-1">
                {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} color="#6b7280" />}
            </TouchableOpacity>

            {isUser && onEdit && (
                <TouchableOpacity onPress={onEdit} className="p-1 mr-1">
                    <Edit2 size={14} color="#6b7280" />
                </TouchableOpacity>
            )}

            {!isUser && onRegenerate && (
                <TouchableOpacity onPress={onRegenerate} className="p-1 mr-1">
                    <RefreshCw size={14} color="#6b7280" />
                </TouchableOpacity>
            )}

            {onDelete && (
                <TouchableOpacity onPress={onDelete} className="p-1">
                    <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
            )}
        </View>
    );
}

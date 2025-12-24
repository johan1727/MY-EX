import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Modal,
    Alert,
    Share,
} from 'react-native';
import {
    Menu,
    Search,
    MoreVertical,
    Star,
    Download,
    Palette,
    X,
    ChevronLeft,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    starred?: boolean;
}

interface ChatHeaderProps {
    exName: string;
    messageCount?: number;
    onMenuPress: () => void;
    onSearch: (query: string) => void;
    onExportChat: () => void;
    onThemeChange: (theme: ChatTheme) => void;
    currentTheme: ChatTheme;
    isSearching: boolean;
    setIsSearching: (val: boolean) => void;
}

export type ChatTheme = 'default' | 'dark' | 'purple' | 'blue' | 'green';

export const CHAT_THEMES: Record<ChatTheme, {
    bg: string;
    bubble: string;
    name: string;
    background: string[];
    bubbleUser: string;
    bubbleEx: string;
    textUser: string;
    textEx: string;
}> = {
    default: {
        bg: '#212121',
        bubble: '#2F2F2F',
        name: 'Premium Dark',
        background: ['#000000', '#1a1a1a'],
        bubbleUser: '#262626',
        bubbleEx: '#1f1f1f',
        textUser: '#FFFFFF',
        textEx: '#E5E5E5',
    },
    dark: {
        bg: '#000000',
        bubble: '#1a1a1a',
        name: 'OLED Black',
        background: ['#000000', '#000000'],
        bubbleUser: '#262626',
        bubbleEx: '#000000',
        textUser: '#FFFFFF',
        textEx: '#E5E5E5',
    },
    purple: {
        bg: '#1a0a2e',
        bubble: '#2d1b4e',
        name: 'Legacy Purple',
        background: ['#1a0a2e', '#2d1b4e'],
        bubbleUser: '#4c1d95',
        bubbleEx: '#2d1b4e',
        textUser: '#FFFFFF',
        textEx: '#E9D5FF',
    },
    blue: {
        bg: '#0a1a2e',
        bubble: '#1b2d4e',
        name: 'Legacy Blue',
        background: ['#0a1a2e', '#1b2d4e'],
        bubbleUser: '#1e3a8a',
        bubbleEx: '#1b2d4e',
        textUser: '#FFFFFF',
        textEx: '#BFDBFE',
    },
    green: {
        bg: '#0a1a0f',
        bubble: '#1b352d',
        name: 'Legacy Green',
        background: ['#0a1a0f', '#1b352d'],
        bubbleUser: '#14532d',
        bubbleEx: '#1b352d',
        textUser: '#FFFFFF',
        textEx: '#BBF7D0',
    },
};

export default function ChatHeader({
    exName = 'Ex',
    messageCount,
    onMenuPress,
    onSearch,
    onExportChat,
    onThemeChange,
    currentTheme,
    isSearching,
    setIsSearching,
}: ChatHeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [showThemes, setShowThemes] = useState(false);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        onSearch(text);
    };

    const handleExport = async () => {
        setShowOptions(false);
        onExportChat();
    };

    if (isSearching) {
        return (
            <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                    onSearch('');
                }}>
                    <ChevronLeft size={24} color="#ECECEC" />
                </TouchableOpacity>
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="Buscar mensajes..."
                    placeholderTextColor="#6b7280"
                    autoFocus
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => {
                        setSearchQuery('');
                        onSearch('');
                    }}>
                        <X size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <>
            <BlurView intensity={80} tint="dark" style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        haptics.impact(haptics.ImpactFeedbackStyle.Light);
                        onMenuPress();
                    }}
                    style={styles.menuButton}
                >
                    <Menu size={24} color="#ECECEC" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.profileInfo}
                    onPress={() => {
                        haptics.impact(haptics.ImpactFeedbackStyle.Light);
                        onMenuPress();
                    }}
                >
                    <LinearGradient
                        colors={['#404040', '#171717']} // Premium Grayscale Gradient
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>
                            {(exName || 'E').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>{exName}</Text>
                        <Text style={styles.status}>
                            en línea
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            haptics.impact(haptics.ImpactFeedbackStyle.Light);
                            setIsSearching(true);
                        }}
                    >
                        <Search size={22} color="#ECECEC" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            haptics.impact(haptics.ImpactFeedbackStyle.Light);
                            setShowOptions(true);
                        }}
                    >
                        <MoreVertical size={22} color="#ECECEC" />
                    </TouchableOpacity>
                </View>
            </BlurView>

            {/* Options Modal */}
            <Modal visible={showOptions} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.optionsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOptions(false)}
                >
                    <View style={styles.optionsMenu}>
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                                setShowOptions(false);
                                setShowThemes(true);
                            }}
                        >
                            <Palette size={20} color="#ECECEC" />
                            <Text style={styles.optionText}>Cambiar tema</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={handleExport}
                        >
                            <Download size={20} color="#22c55e" />
                            <Text style={styles.optionText}>Exportar chat</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Theme Selector Modal */}
            <Modal visible={showThemes} transparent animationType="slide">
                <View style={styles.themeOverlay}>
                    <View style={styles.themeModal}>
                        <View style={styles.themeHeader}>
                            <Text style={styles.themeTitle}>Temas de Chat</Text>
                            <TouchableOpacity onPress={() => setShowThemes(false)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.themesGrid}>
                            {(Object.keys(CHAT_THEMES) as ChatTheme[]).map((themeKey) => (
                                <TouchableOpacity
                                    key={themeKey}
                                    style={[
                                        styles.themeOption,
                                        { backgroundColor: CHAT_THEMES[themeKey].bg },
                                        currentTheme === themeKey && styles.themeSelected,
                                    ]}
                                    onPress={() => {
                                        onThemeChange(themeKey);
                                        setShowThemes(false);
                                    }}
                                >
                                    <View style={[
                                        styles.themeBubble,
                                        { backgroundColor: CHAT_THEMES[themeKey].bubble }
                                    ]} />
                                    <Text style={styles.themeName}>
                                        {CHAT_THEMES[themeKey].name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(33, 33, 33, 0.6)', // Semi-transparent Matte Black
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        // position: 'absolute', // Uncomment to overlay content
        // top: 0,
        // left: 0,
        // right: 0,
        // zIndex: 100,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#212121',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#ECECEC',
        paddingVertical: 8,
    },
    menuButton: {
        padding: 8,
    },
    profileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ECECEC',
    },
    nameContainer: {
        marginLeft: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ECECEC',
    },
    status: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    optionsMenu: {
        backgroundColor: '#212121',
        borderRadius: 12,
        padding: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    optionText: {
        fontSize: 15,
        color: '#ECECEC',
    },
    themeOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    themeModal: {
        backgroundColor: '#212121',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    themeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    themeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ECECEC',
    },
    themesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    themeOption: {
        flexBasis: '30%',
        minWidth: 100,
        maxWidth: 150,
        aspectRatio: 0.8,
        borderRadius: 12,
        padding: 12,
        margin: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    themeSelected: {
        borderColor: '#ECECEC', // White border for selection
    },
    themeBubble: {
        width: 40,
        height: 24,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    themeName: {
        fontSize: 12,
        color: '#ECECEC',
        fontWeight: '500',
    },
});

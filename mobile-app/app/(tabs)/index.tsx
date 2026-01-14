                                {/* AI Footer - ChatGPT style */}
                                {msg.role === 'assistant' && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                                        <Sparkles size={11} color="#6b7280" />
                                        <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500' }}>IA</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert('Opciones', '', [
                                                    { text: '🚩 Reportar contenido inapropiado', onPress: async () => { await reportAIContent(\sim_msg_\\, msg.content, 'ex_simulator', 'current_user_id'); } },
                                                    { text: 'Cancelar', style: 'cancel' }
                                                ]);
                                            }}
                                            style={{ marginLeft: 'auto', padding: 4, opacity: 0.5 }}
                                        >
                                            <MoreVertical size={14} color="#6b7280" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageRow, styles.messageRowAssistant]}>
                            <View style={styles.messageAvatar}>
                                <Text style={styles.messageAvatarText}>{profileData.exName[0]}</Text>
                            </View>
                            <View style={styles.typingBubble}>
                                <Text style={styles.typingText}>...</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
                    <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                            {/* Image Picker Button */}
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                        if (status !== 'granted') {
                                            Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
                                            return;
                                        }
                                        const result = await ImagePicker.launchImageLibraryAsync({
                                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                            quality: 0.7,
                                        });
                                        if (!result.canceled) {
                                            Alert.alert('AnÃ¡lisis de imagen', 'FunciÃ³n de anÃ¡lisis de imÃ¡genes prÃ³ximamente.');
                                        }
                                    } catch (error) {
                                        console.error('ImagePicker error:', error);
                                    }
                                }}
                                style={styles.imageButton}
                            >
                                <ImageIcon size={20} color="#9ca3af" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Escribe un mensaje..."
                                placeholderTextColor="#666"
                                value={inputText}
                                onChangeText={setInputText}
                                onSubmitEditing={() => sendMessage()}
                                editable={!isTyping}
                                multiline
                            />
                            {/* Send Button */}
                            {inputText.trim() !== '' && (
                                <TouchableOpacity
                                    onPress={() => sendMessage()}
                                    disabled={isTyping}
                                    style={styles.sendButton}
                                >
                                    <Send size={20} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    {/* Gemini-style Preview Bubble */}
                    {inputText.trim() !== '' && (
                        <Animated.View
                            style={[
                                styles.previewBubble,
                                {
                                    opacity: new Animated.Value(1), // Simple fade could be enhanced with useEffect
                                    transform: [{ translateY: 0 }]
                                }
                            ]}
                        >
                            <Text style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
                                {inputText}
                            </Text>
                        </Animated.View>
                    )}
                </SafeAreaView>
            </KeyboardAvoidingView>

            {/* LOGIN RECOMMENDATION MODAL */}
            <Modal
                visible={showLoginModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLoginModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIcon}>
                            <Sparkles size={40} color="#a855f7" />
                        </View>
                        <Text style={styles.modalTitle}>Â¡Guarda tu conversaciÃ³n!</Text>
                        <Text style={styles.modalText}>
                            Crea una cuenta para que tu simulaciÃ³n y anÃ¡lisis se guarden automÃ¡ticamente.
                            Sin cuenta, podrÃ­as perder tus datos.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalPrimaryBtn}
                            onPress={() => {
                                setShowLoginModal(false);
                                router.push('/auth');
                            }}
                        >
                            <Text style={styles.modalPrimaryText}>Crear cuenta / Iniciar sesiÃ³n</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalSecondaryBtn}
                            onPress={() => setShowLoginModal(false)}
                        >
                            <Text style={styles.modalSecondaryText}>Continuar sin guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* UPGRADE MODAL - When free messages run out */}
            <Modal
                visible={showUpgradeModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowUpgradeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { padding: 32, borderRadius: 24, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' }]}>
                        <View style={{
                            width: 64, height: 64, borderRadius: 32,
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            alignItems: 'center', justifyContent: 'center',
                            marginBottom: 20
                        }}>
                            <Sparkles size={32} color="#a855f7" />
                        </View>

                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
                            Has alcanzado el lÃ­mite
                        </Text>

                        <Text style={{
                            fontSize: 16, color: '#a1a1aa', textAlign: 'center',
                            marginBottom: 28, lineHeight: 24
                        }}>
                            Los usuarios gratuitos tienen 10 mensajes por simulaciÃ³n.
                            Actualiza a Premium para chatear sin lÃ­mites y desbloquear el anÃ¡lisis profundo.
                        </Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#a855f7',
                                width: '100%',
                                paddingVertical: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                                shadowColor: '#a855f7',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                                marginBottom: 16
                            }}
                            onPress={() => {
                                setShowUpgradeModal(false);
                                router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Ver planes Premium</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ padding: 12 }}
                            onPress={() => setShowUpgradeModal(false)}
                        >
                            <Text style={{ color: '#71717a', fontSize: 15, fontWeight: '500' }}>QuizÃ¡s despuÃ©s</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ProfileDrawer */}
            <ProfileDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                currentProfileId={profileData?.id || profileData?.supabaseId}
                onProfileSwitch={async (profile) => {
                    console.log('[ExChat] Profile switched to:', profile.exName);
                    setDrawerVisible(false);

                    // Explicitly show loading state
                    setIsLoadingProfile(true);
                    setProfileData(null);
                    setMessages([]);

                    // Small delay to ensure state clears then reload
                    setTimeout(async () => {
                        await loadProfile();
                        // Ensure loading is turned off if it stuck
                        setTimeout(() => setIsLoadingProfile(false), 500);
                    }, 150);
                }}
                onProfileDeleted={() => {
                    console.log('[ExChat] Profile deleted, resetting state...');
                    setProfileData(null);
                    setMessages([]);
                    setMemoryFacts([]);
                    setEmotionalSession(null);
                    setConversationMemory('');
                    setUserName('');
                    setPastSummaries('');
                    // Do not reload profile immediately, stick to empty state
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        marginTop: 12,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messagesContent: {
        paddingTop: 16,
        paddingBottom: 20,
    },
    messageRow: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAssistant: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#2A2A2A',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#1A1A1A',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    messageTime: {
        marginTop: 4,
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        alignSelf: 'flex-end',
    },
    typingBubble: {
        backgroundColor: '#1A1A1A',
        padding: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
    },
    typingText: {
        color: '#9ca3af',
        fontSize: 18,
        letterSpacing: 2,
    },
    // Empty State
    headerSafe: {
        zIndex: 10,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    emptyStateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    actionCards: {
        width: '100%',
        gap: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: '#9ca3af',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
    },
    imageButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        marginLeft: 12,
        backgroundColor: '#6366f1',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    modalIcon: {
        marginBottom: 16,
    },
    upgradeEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalPrimaryBtn: {
        backgroundColor: '#a855f7',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalPrimaryText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalSecondaryBtn: {
        paddingVertical: 12,
    },
    modalSecondaryText: {
        color: '#6b7280',
        fontSize: 15,
    },
    // Gemini Preview
    // Gemini Preview
    previewBubble: {
        position: 'absolute',
        bottom: 90, // Increased to clear input safely
        left: 20,
        right: 20, // Constrain width
        backgroundColor: 'rgba(168, 85, 247, 0.95)', // Slightly more opaque
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999, // Force on top
        borderBottomLeftRadius: 4,
    },
    previewText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function HelpScreen() {
  const router = useRouter();

  const faqs = [
    { question: "How do I adopt a pet?", answer: "Browse the 'Adopt' section, find a pet you love, and tap 'Apply for Adoption' to submit your application directly to the current owner." },
    { question: "How do I report a lost pet?", answer: "Go to the 'Lost & Found' tab and tap the '+' button to create a new lost pet alert. Provide as many details and photos as possible." },
    { question: "How can I contact a vet?", answer: "In the 'Pet Care' section, select a clinic or veterinarian to view their profile, where you will find options to call or WhatsApp them directly." },
    { question: "Is my personal data safe?", answer: "Yes, we prioritize your privacy. You can manage your visibility and data settings in the Privacy Center." },
  ];

  const handleWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=923000000000'); // Example support number
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@paltuu.com');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Help & Support</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Contact Support */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Contact Us</Text>
        <View className="flex-row space-x-4 mb-8">
          <TouchableOpacity 
            onPress={handleWhatsApp}
            className="flex-1 bg-green-500 py-4 rounded-2xl flex-row items-center justify-center space-x-2"
          >
            <FontAwesome5 name="whatsapp" size={18} color="white" />
            <Text className="text-white font-headingSemi text-sm">WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleEmail}
            className="flex-1 bg-gray-100 py-4 rounded-2xl flex-row items-center justify-center space-x-2"
          >
            <Feather name="mail" size={18} color="#374151" />
            <Text className="text-gray-700 font-headingSemi text-sm">Email Us</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Frequently Asked Questions</Text>
        <View className="mb-10 space-y-4">
          {faqs.map((faq, index) => (
            <View key={index} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <Text className="font-headingSemi text-base text-dark mb-2">{faq.question}</Text>
              <Text className="font-body text-gray-500 leading-relaxed text-sm">{faq.answer}</Text>
            </View>
          ))}
        </View>

        {/* Community Guidelines */}
        <TouchableOpacity className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex-row items-center justify-between mb-10">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="bg-primary/10 p-3 rounded-full mr-4">
              <Ionicons name="book-outline" size={24} color="#A03048" />
            </View>
            <View>
              <Text className="font-heading text-base text-dark">Community Guidelines</Text>
              <Text className="font-body text-gray-500 text-xs mt-1">Learn how to keep Paltuu safe</Text>
            </View>
          </View>
          <Feather name="external-link" size={20} color="#A03048" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

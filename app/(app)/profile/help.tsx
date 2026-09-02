import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_WHATSAPP = '923000000000'; // TODO: replace with the real support number
const SUPPORT_EMAIL = 'support@paltuu.pk';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const FAQS: { icon: FeatherName; question: string; answer: string }[] = [
  {
    icon: 'heart',
    question: 'How do I adopt a pet?',
    answer:
      "Browse the 'Adopt' section, find a pet you love, and tap 'Apply for Adoption' to submit your application directly to the current owner.",
  },
  {
    icon: 'map-pin',
    question: 'How do I report a lost pet?',
    answer:
      "Go to the 'Lost & Found' tab and tap the '+' button to create a new lost pet alert. Add as many details and photos as you can.",
  },
  {
    icon: 'plus-circle',
    question: 'How can I contact a vet?',
    answer:
      "In the 'Pet Care' section, open a clinic or veterinarian profile to find options to call or WhatsApp them directly.",
  },
  {
    icon: 'shield',
    question: 'Is my personal data safe?',
    answer:
      'Yes. We prioritise your privacy — you can manage your visibility and data settings any time in the Privacy Center.',
  },
];

const RESOURCES: { icon: FeatherName; label: string; sub: string; url: string }[] = [
  {
    icon: 'life-buoy',
    label: 'Help Center',
    sub: 'Guides and answers on the web',
    url: 'https://paltuu.pk/support',
  },
  {
    icon: 'shield',
    label: 'Child Safety Standards',
    sub: 'Our policy against child abuse & exploitation',
    url: 'https://paltuu.pk/child-safety',
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-headingSemi text-[11px] text-gray-400 mb-2 ml-1 uppercase tracking-widest">
      {children}
    </Text>
  );
}

function ContactRow({
  iconTint,
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  iconTint: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className={`flex-row items-center px-4 py-4 ${last ? '' : 'border-b border-gray-100'}`}
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3.5"
        style={{ backgroundColor: `${iconTint}1A` }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-headingSemi text-[15px] text-dark">{title}</Text>
        <Text className="font-body text-gray-400 text-xs mt-0.5">{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#999999" />
    </TouchableOpacity>
  );
}

function FaqItem({
  icon,
  question,
  answer,
  open,
  onToggle,
}: {
  icon: FeatherName;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="bg-surfaceElevated rounded-2xl border border-gray-100 overflow-hidden">
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.6}
        className="flex-row items-center px-4 py-4"
      >
        <View className="w-9 h-9 rounded-full bg-primarySoft items-center justify-center mr-3">
          <Feather name={icon} size={16} color="#a03048" />
        </View>
        <Text className="flex-1 font-headingSemi text-[14px] text-dark pr-3">{question}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#999999" />
      </TouchableOpacity>
      {open && (
        <View className="px-4 pb-4 pl-16">
          <Text className="font-body text-gray-500 text-[13px] leading-5">{answer}</Text>
        </View>
      )}
    </View>
  );
}

function HelpScreen() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((cur) => (cur === index ? null : index));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'))}
          className="mr-4 p-1"
        >
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Help & Support</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact */}
        <SectionLabel>Contact Us</SectionLabel>
        <View className="bg-surfaceElevated rounded-2xl border border-gray-100 overflow-hidden mb-8">
          <ContactRow
            iconTint="#25D366"
            icon={<FontAwesome5 name="whatsapp" size={18} color="#25D366" />}
            title="WhatsApp us"
            subtitle="Fastest way to reach the team"
            onPress={() => Linking.openURL(`whatsapp://send?phone=${SUPPORT_WHATSAPP}`)}
          />
          <ContactRow
            iconTint="#a03048"
            icon={<Feather name="mail" size={18} color="#a03048" />}
            title="Email support"
            subtitle={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            last
          />
        </View>

        {/* FAQs */}
        <SectionLabel>Frequently Asked Questions</SectionLabel>
        <View className="gap-3 mb-8">
          {FAQS.map((faq, index) => (
            <FaqItem
              key={faq.question}
              icon={faq.icon}
              question={faq.question}
              answer={faq.answer}
              open={openFaq === index}
              onToggle={() => toggleFaq(index)}
            />
          ))}
        </View>

        {/* Resources */}
        <SectionLabel>More Help</SectionLabel>
        <View className="bg-surfaceElevated rounded-2xl border border-gray-100 overflow-hidden">
          {RESOURCES.map((r, i) => (
            <TouchableOpacity
              key={r.url}
              onPress={() => WebBrowser.openBrowserAsync(r.url)}
              activeOpacity={0.6}
              className={`flex-row items-center px-4 py-4 ${i === RESOURCES.length - 1 ? '' : 'border-b border-gray-100'}`}
            >
              <View className="w-11 h-11 rounded-full bg-primarySoft items-center justify-center mr-3.5">
                <Feather name={r.icon} size={18} color="#a03048" />
              </View>
              <View className="flex-1">
                <Text className="font-headingSemi text-[15px] text-dark">{r.label}</Text>
                <Text className="font-body text-gray-400 text-xs mt-0.5">{r.sub}</Text>
              </View>
              <Feather name="external-link" size={18} color="#999999" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withFocusUnmount(HelpScreen);

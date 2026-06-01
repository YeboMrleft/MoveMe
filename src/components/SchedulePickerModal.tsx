import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onConfirm: (timestamp: number) => void;
  onClose: () => void;
}

const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
TIME_SLOTS.push('22:00');

function buildDays(): { label: string; short: string; date: Date }[] {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }),
      short: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' }),
      date: d,
    });
  }
  return days;
}

export default function SchedulePickerModal({ visible, onConfirm, onClose }: Props) {
  const days = buildDays();
  const [dayIdx, setDayIdx] = useState(0);
  const [timeSlot, setTimeSlot] = useState('08:00');

  const handleConfirm = () => {
    const base = new Date(days[dayIdx].date);
    const [h, m] = timeSlot.split(':').map(Number);
    base.setHours(h, m, 0, 0);
    onConfirm(base.getTime());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Schedule job</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Date selector */}
          <Text style={styles.sectionLabel}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
            {days.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayPill, dayIdx === i && styles.dayPillActive]}
                onPress={() => setDayIdx(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, dayIdx === i && styles.dayTextActive]}>
                  {d.short}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time selector */}
          <Text style={styles.sectionLabel}>Time</Text>
          <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timePill, timeSlot === slot && styles.timePillActive]}
                  onPress={() => setTimeSlot(slot)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeText, timeSlot === slot && styles.timeTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Summary */}
          <View style={styles.summary}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.summaryText}>
              {days[dayIdx].label} at {timeSlot}
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>Confirm Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  daysRow: { gap: 8, paddingBottom: 20 },
  dayPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dayTextActive: { color: colors.white },
  timeScroll: { maxHeight: 200, marginBottom: 16 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: {
    width: '22%', paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  timePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { fontSize: 13, fontWeight: '600', color: colors.text },
  timeTextActive: { color: colors.white },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary + '12', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  summaryText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  confirmText: { fontSize: 16, fontWeight: '800', color: colors.white },
});

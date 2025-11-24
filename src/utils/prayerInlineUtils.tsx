import React from 'react';
import { Text, View, Image } from 'react-native';
import { getPublicImageUrl } from './imageStorage';
import { Avatar } from '../shared/ui';
import type { PrayerPerson } from './prayerUtils';

type Options = {
  highlightStyle?: any;
  avatarSize?: number;
  marginLeft?: number;
  limitOnePerPersonPerParagraph?: boolean;
  baseTextStyle?: any; // applied to both normal and highlighted text chunks
};

// Local helpers mirror logic in prayerUtils.tsx (kept internal to avoid refactors)
function getNameForMatching(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const firstChar = Array.from(trimmed)[0] || '';
  // Basic emoji check
  if (/\p{Emoji}/u.test(firstChar)) {
    return trimmed;
  }
  const parts = trimmed.split(' ');
  const firstWord = (parts[0] || '').toLowerCase();
  const commonArticles = ['the', 'a', 'an'];
  if (commonArticles.indexOf(firstWord) !== -1 && parts.length > 1) {
    return trimmed;
  }
  return parts[0] || trimmed;
}

function findNameOccurrences(text: string, name: string): [number, number][] {
  const out: [number, number][] = [];
  const nameToMatch = getNameForMatching(name);
  if (!nameToMatch || nameToMatch.length < 2) return out;
  const escaped = nameToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

export function createHighlightedPrayerNodes(
  text: string,
  people: PrayerPerson[],
  opts: Options = {}
): React.ReactNode[] {
  if (!text || !people || people.length === 0) {
    return [<Text key="t0">{text}</Text>];
  }

  const baseTextStyle = opts.baseTextStyle || null;
  const highlightStyle = opts.highlightStyle || { color: '#FFD700', fontWeight: '700' };
  const avatarSize = opts.avatarSize ?? 16;
  const marginLeft = opts.marginLeft ?? 6;

  const occurrences: { start: number; end: number; person: PrayerPerson }[] = [];

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const spans = findNameOccurrences(text, person.name);
    for (let j = 0; j < spans.length; j++) {
      const s = spans[j];
      occurrences.push({ start: s[0], end: s[1], person });
    }
  }

  // sort by start
  occurrences.sort((a, b) => a.start - b.start);

  // filter overlaps: keep earliest
  const filtered: { start: number; end: number; person: PrayerPerson }[] = [];
  for (let i = 0; i < occurrences.length; i++) {
    const curr = occurrences[i];
    if (filtered.length === 0 || curr.start >= filtered[filtered.length - 1].end) {
      filtered.push(curr);
    }
  }

  // Optionally limit to one avatar per person per paragraph: naive approach
  const usedPersonIds: string[] = [];

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (let i = 0; i < filtered.length; i++) {
    const occ = filtered[i];
    if (occ.start > last) {
      nodes.push(
        <Text key={`t${key++}`} style={baseTextStyle}>
          {text.slice(last, occ.start)}
        </Text>
      );
    }

    nodes.push(
      <Text key={`h${key++}`} style={[baseTextStyle, highlightStyle]}>
        {text.slice(occ.start, occ.end)}
      </Text>
    );

    let shouldRenderAvatar = true;
    if (opts.limitOnePerPersonPerParagraph) {
      if (usedPersonIds.indexOf(occ.person.id) !== -1) {
        shouldRenderAvatar = false;
      } else {
        usedPersonIds.push(occ.person.id);
      }
    }

    if (shouldRenderAvatar) {
      nodes.push(
        <View key={`a${key++}`} style={{ marginLeft, marginRight: 2, alignSelf: 'center', transform: [{ translateY: 2 }] }}>
          <Avatar image_uri={occ.person.image_uri} name={occ.person.name} size={avatarSize} />
        </View>
      );
    }

    last = occ.end;
  }

  if (last < text.length) {
    nodes.push(
      <Text key={`t${key++}`} style={baseTextStyle}>
        {text.slice(last)}
      </Text>
    );
  }

  return nodes;
}

/**
 * Single-Text inline renderer to avoid forced wraps after avatar.
 * Returns one <Text> node with nested <Text> chunks and an inline <Image> after each highlighted name.
 */
export function createInlinePrayerRichText(
  text: string,
  people: PrayerPerson[],
  opts: Options = {}
): React.ReactElement {
  const baseTextStyle = opts.baseTextStyle || null;
  const highlightStyle = opts.highlightStyle || { color: '#FFD700', fontWeight: '700' };
  const avatarSize = opts.avatarSize ?? 16;
  const marginLeft = opts.marginLeft ?? 6;

  if (!text || !people || people.length === 0) {
    return <Text style={baseTextStyle}>{text}</Text>;
  }

  const occurrences: { start: number; end: number; person: PrayerPerson }[] = [];
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const spans = findNameOccurrences(text, person.name);
    for (let j = 0; j < spans.length; j++) {
      const s = spans[j];
      occurrences.push({ start: s[0], end: s[1], person });
    }
  }

  occurrences.sort((a, b) => a.start - b.start);
  const filtered: { start: number; end: number; person: PrayerPerson }[] = [];
  for (let i = 0; i < occurrences.length; i++) {
    const curr = occurrences[i];
    if (filtered.length === 0 || curr.start >= filtered[filtered.length - 1].end) {
      filtered.push(curr);
    }
  }

  const children: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (let i = 0; i < filtered.length; i++) {
    const occ = filtered[i];
    if (occ.start > last) {
      children.push(
        <Text key={`t${key++}`} style={baseTextStyle}>
          {text.slice(last, occ.start)}
        </Text>
      );
    }

    // Avatar BEFORE the name
    const rawUri = occ.person.image_uri || undefined;
    const resolved = rawUri ? getPublicImageUrl(rawUri) : null;
    if (resolved) {
      children.push(
        <Image
          key={`ai${key++}`}
          source={{ uri: resolved }}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            marginRight: marginLeft,
          }}
        />
      );
    }

    children.push(
      <Text key={`h${key++}`} style={[baseTextStyle, highlightStyle]}>
        {text.slice(occ.start, occ.end)}
      </Text>
    );

    last = occ.end;
  }

  if (last < text.length) {
    children.push(
      <Text key={`t${key++}`} style={baseTextStyle}>
        {text.slice(last)}
      </Text>
    );
  }

  return <Text style={baseTextStyle}>{children}</Text>;
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Award,
  Calendar,
  Flame,
  Sparkles,
  ExternalLink,
  Volume2,
  X,
  Bot,
  Send,
} from 'lucide-react';

import { Marathon, User } from '../types';
import ChallengeView from './ChallengeView';
import { marathonService } from '../services/marathonService';
import { submissionService } from '../services/submissionService';
import { storageKeys, storageService } from '../services/storageService';

interface PlayerCabinetProps {
  currentUser: User | null;
  submissions: any[];
  monthlyPlayerRecords?: any[];
  onUpdateProfile: (data: Partial<User>) => Promise<any>;
  onLeaveGame: () => Promise<any>;
  onStateUpdate?: () => void;
  lang?: 'ka' | 'en';
  activeCabinetTab?: string;
  setActiveCabinetTab?: (tab: string) => void;
  selectedMarathonId?: string;
  setSelectedMarathonId?: (id: string) => void;
  onStartRegister?: () => void;
  onStartLogin?: () => void;
}

type FullscreenMedia = {
  url: string;
  type: string;
  title: string;
  submission?: any;
};

type GuideMessage = {
  id: string;
  role: 'guide' | 'player';
  text: string;
};

function normalizeMarathonId(id: string) {
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function shortMarathonId(id: string) {
  return id.replace('marathon-', '');
}

const EXTRA_SUBMISSIONS_KEY = 'bifurcation_submissions';

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [storageKeys.submissions, EXTRA_SUBMISSIONS_KEY].filter(
        (key): key is string => Boolean(key)
      )
    )
  );
}

function getMediaUrl(submission: any) {
  return (
    submission.tiktokUrl ||
    submission.tiktok_url ||
    submission.socialUrl ||
    submission.social_url ||
    submission.externalUrl ||
    submission.external_url ||
    submission.fileUrl ||
    submission.videoUrl ||
    submission.localPreviewUrl ||
    submission.file_url ||
    submission.video_url ||
    submission.local_preview_url ||
    ''
  );
}

function isTikTokSubmission(submission: any) {
  const type = (submission.submissionType || submission.submission_type || '').toLowerCase();
  const platform = (submission.socialPlatform || submission.social_platform || '').toLowerCase();
  const url = getMediaUrl(submission).toLowerCase();

  return (
    type === 'tiktok' ||
    type === 'social' ||
    platform === 'tiktok' ||
    url.includes('tiktok.com') ||
    url.includes('vt.tiktok.com') ||
    url.includes('vm.tiktok.com')
  );
}

function getSubmissionDate(submission: any) {
  return new Date(
    submission.createdAt || submission.created_at || submission.updatedAt || 0
  ).getTime();
}

function getSubmissionText(submission: any) {
  return (
    submission.comment ||
    submission.reflectionText ||
    submission.textDescription ||
    submission.description ||
    submission.reflection_text ||
    submission.text_description ||
    ''
  );
}

function extractTikTokVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/(\d+)/);

    return match?.[1] || '';
  } catch {
    const match = url.match(/\/video\/(\d+)/);
    return match?.[1] || '';
  }
}

function normalizeTikTokUrl(url: string) {
  return url.split('?')[0];
}

function createGuideAnswer(question: string, lang: 'ka' | 'en' = 'ka') {
  const raw = question.trim();
  const text = raw.toLowerCase();

  const hasAny = (words: string[]) => words.some(word => text.includes(word));

  const isKa = lang === 'ka';

  const answer = (ka: string, en: string) => (isKa ? ka : en);

  if (!raw) {
    return answer(
      'მომწერე კითხვა ერთი წინადადებით და მე ნაბიჯ-ნაბიჯ დაგეხმარები.',
      'Write your question in one sentence and I will help you step by step.'
    );
  }

  if (
    hasAny([
      'tiktok',
      'ტიკტოკ',
      'ბმულ',
      'ლინკ',
      'ვიდეო',
      'ატვირთ',
      'proof',
      'submit',
      'link',
      'upload',
    ])
  ) {
    return answer(
      [
        'კი, დაგეხმარები. TikTok ბმულის დასადასტურებლად გააკეთე ასე:',
        '1) ჯერ გამოწვევა გახსენი და დააჭირე „მიიღე გამოწვევა“.',
        '2) ვიდეო გადაიღე უსაფრთხოდ და ატვირთე TikTok-ზე საჯაროდ.',
        '3) TikTok-იდან დააკოპირე ვიდეოს ბმული. უკეთესია სრული ბმული /@username/video/... ფორმატით.',
        '4) დაბრუნდი საიტზე, გახსენი იგივე გამოწვევა და ჩასვი ბმული TikTok ველში.',
        '5) დააჭირე „დაადასტურე TikTok ბმულით“.',
        'თუ ბმული არ ჩანს კედელზე, განაახლე გვერდი და გადაამოწმე, რომ შესული ხარ იმავე კაბინეტში.',
      ].join('\n'),
      [
        'Sure. To submit a TikTok proof:',
        '1) Open the challenge and press “Accept challenge”.',
        '2) Record your video safely and publish it publicly on TikTok.',
        '3) Copy the TikTok video link. A full /@username/video/... link works best.',
        '4) Return to the same challenge and paste the link into the TikTok field.',
        '5) Press “Confirm with TikTok link”.',
        'If it does not appear on the wall, refresh the page and make sure you are logged into the same cabinet.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'ქულ',
      'ბალანს',
      'რეიტინგ',
      'ლიდერ',
      'გული',
      'მოწონ',
      'ნახვ',
      'კომენტ',
      'score',
      'point',
      'rating',
      'ranking',
      'leader',
      'like',
      'view',
      'comment',
    ])
  ) {
    return answer(
      [
        'ქულების ლოგიკა ასეთია:',
        '• გამოწვევის შესრულება გაძლევს საბაზისო ქულას.',
        '• დროულად შესრულება გაძლევს დამატებით ბონუსს.',
        '• საიტზე უნიკალური ნახვები, გულები და კომენტარები ზრდის აქტივობის ქულებს.',
        '• ერთი ადამიანი ერთ პოსტზე ერთჯერადად ითვლება, რომ რეიტინგი სამართლიანი იყოს.',
        '• საკუთარი პოსტის მოწონება ქულას არ გაძლევს.',
        '• დონაცია ქულებსა და რეიტინგზე არ მოქმედებს.',
        'რეიტინგში უნდა ჩანდეს ყველაზე მაღალი ქულის მქონე აქტიური მოთამაშეები, არა მხოლოდ ის ხალხი, ვინც იმ წამს საიტზეა.',
      ].join('\n'),
      [
        'The scoring works like this:',
        '• Completing a challenge gives base points.',
        '• Completing it before the deadline adds a bonus.',
        '• Unique website views, hearts and comments add engagement points.',
        '• Each person counts once per post to keep ranking fair.',
        '• Liking your own post does not give points.',
        '• Donations never affect points or ranking.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'ვერ',
      'არ მუშაობ',
      'შეცდომ',
      'გაჭედ',
      'ჭედ',
      'ნელი',
      'არ ჩანს',
      'არ იხსნება',
      'პრობლ',
      'error',
      'problem',
      'bug',
      'slow',
      'stuck',
      'not working',
      'does not work',
      'not visible',
    ])
  ) {
    return answer(
      [
        'მოდი ტექნიკური პრობლემა მშვიდად გადავამოწმოთ:',
        '1) ჯერ გვერდი განაახლე.',
        '2) შეამოწმე, რომ შესული ხარ სწორ კაბინეტში.',
        '3) თუ TikTok ვიდეო არ იხსნება, დააჭირე „TikTok-ზე ნახვა“ — ზოგ ვიდეოს embed-ს TikTok თვითონ ზღუდავს.',
        '4) თუ კომენტარი/გული არ ემატება, სცადე სხვა ანგარიშით ან სტუმრის რეჟიმით; საკუთარ პოსტზე გული არ ითვლება.',
        '5) თუ საიტი შენელდა, დახურე ზედმეტი ფანჯრები და დატოვე მხოლოდ ერთი საიტის tab.',
        'მომწერე ზუსტად რა ღილაკს აჭერ და რა ხდება ეკრანზე — გეტყვი შემდეგ ნაბიჯს.',
      ].join('\n'),
      [
        'Let’s troubleshoot step by step:',
        '1) Refresh the page.',
        '2) Make sure you are logged into the correct cabinet.',
        '3) If TikTok does not embed, use “Open on TikTok” — some videos are restricted by TikTok.',
        '4) If hearts/comments do not update, try another account or guest mode; your own post cannot receive points from your own heart.',
        '5) If the site slows down, close extra tabs and keep one game tab open.',
        'Tell me exactly which button you click and what happens on screen.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'იდეა',
      'როგორ გადავიღო',
      'რა გადავიღო',
      'შთაგონ',
      'კრეატ',
      'challenge idea',
      'idea',
      'creative',
      'inspiration',
    ])
  ) {
    return answer(
      [
        'აი უსაფრთხო და კრეატიული მიდგომა:',
        '1) აირჩიე იდეა, რომელიც არ არის საშიში და არავის ამცირებს.',
        '2) ვიდეო დაიწყე მოკლე კადრით: „მე ვიღებ ამ გამოწვევას“.',
        '3) აჩვენე პროცესი 2–3 მოკლე სცენით.',
        '4) ბოლოს დაამატე დასკვნა: რა ისწავლე, რა გაგიჭირდა ან რა გაგამხნევა.',
        '5) თუ არ ხარ დარწმუნებული, აირჩიე უფრო მარტივი ვერსია — ხარისხი და გულწრფელობა უფრო მნიშვნელოვანია, ვიდრე რისკი.',
      ].join('\n'),
      [
        'Here is a safe creative structure:',
        '1) Choose an idea that is not risky or humiliating.',
        '2) Start with a short line: “I accept this challenge”.',
        '3) Show the process in 2–3 short scenes.',
        '4) End with what you learned or what encouraged you.',
        '5) When unsure, choose a simpler version — sincerity matters more than risk.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'მეშინ',
      'მოტივ',
      'არ შემიძლია',
      'დავიღალე',
      'დამეხმარე',
      'გამბედაობ',
      'fear',
      'motivation',
      'tired',
      'confidence',
      'brave',
      'courage',
    ])
  ) {
    return answer(
      [
        'შენ არ გჭირდება იდეალური შესრულება — გჭირდება პატარა, უსაფრთხო ნაბიჯი.',
        'აი მარტივი ფორმულა:',
        '1) შეამცირე გამოწვევა ყველაზე პატარა მოქმედებამდე.',
        '2) გააკეთე 10-წამიანი საცდელი ვიდეო, თუნდაც არ ატვირთო.',
        '3) აირჩიე მშვიდი გარემო და ისეთი ფორმა, სადაც თავს დაცულად გრძნობ.',
        '4) გახსოვდეს: ამ თამაშში მიზანი საკუთარი ზრდაა, არა სხვებთან შედარება.',
        'შენ შეგიძლია ნელა, ღირსეულად და შენს ტემპში.',
      ].join('\n'),
      [
        'You do not need a perfect performance — you need one safe small step.',
        'Try this:',
        '1) Reduce the challenge to the smallest action.',
        '2) Record a 10-second test video, even if you do not upload it.',
        '3) Choose a calm setting where you feel safe.',
        '4) The goal is growth, not comparison.',
        'You can move at your own pace.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'უსაფრთხ',
      'რისკ',
      'საფრთხ',
      'შეიძლება თუ არა',
      'დაშავ',
      'safe',
      'safety',
      'risk',
      'danger',
      'allowed',
    ])
  ) {
    return answer(
      [
        'უსაფრთხოების წესი ასეთია:',
        '• არ გააკეთო არაფერი, რაც შეიძლება დაგაზიანოს შენ ან სხვას.',
        '• არ გადაიღო ადამიანი მისი თანხმობის გარეშე.',
        '• არ გამოიყენო დამამცირებელი, შეურაცხმყოფელი ან სარისკო მოქმედება.',
        '• თუ იდეა ოდნავ მაინც სახიფათოდ გეჩვენება, შეცვალე უფრო მშვიდი და სიმბოლური ფორმით.',
        'კარგი გამოწვევა არის გაბედული, მაგრამ არა სახიფათო.',
      ].join('\n'),
      [
        'Safety rule:',
        '• Do nothing that can harm you or others.',
        '• Do not film people without consent.',
        '• Avoid humiliating, offensive or risky actions.',
        '• If an idea feels even slightly unsafe, change it into a calmer symbolic version.',
        'A good challenge is brave, not dangerous.',
      ].join('\n')
    );
  }

  if (
    hasAny([
      'დონაცი',
      'პრიზ',
      'ფული',
      'გადახდ',
      'donation',
      'prize',
      'money',
      'pay',
    ])
  ) {
    return answer(
      [
        'თამაში უფასოა. ფულადი პრიზი უკავშირდება თამაშის შედეგებს და არა გადახდას.',
        'დონაცია არის მხოლოდ ნებაყოფლობითი მხარდაჭერა — ის არ ზრდის ქულებს, არ ცვლის რეიტინგს და არ გაძლევს უპირატესობას.',
        'დონაციით ეხმარები თამაშის გაგრძელებას, პრიზის მხარდაჭერას, საიტის გაუმჯობესებას და ახალი ახალგაზრდული/საგანმანათლებლო პროგრამების შექმნას. მხარდაჭერა კეთდება მხოლოდ სურვილით და არასოდეს არის თამაშში მონაწილეობის პირობა.',
      ].join('\n'),
      [
        'The game is free. The cash prize is based on game results, not payment.',
        'Donations are voluntary support only — they do not increase points, change ranking or give advantage.',
        'Donations help keep the game running and support future educational programs.',
      ].join('\n')
    );
  }

  return answer(
    [
      'მესმის. ამ კითხვაზე ასე გიპასუხებ:',
      '1) ჯერ დააზუსტე, რას გინდა მიაღწიო — გამოწვევის შესრულება, ტექნიკური პრობლემის მოგვარება, იდეის მოფიქრება თუ ქულების გაგება.',
      '2) თუ საქმე გამოწვევას ეხება, დაიწყე უსაფრთხო და მარტივი ვარიანტით.',
      '3) თუ ტექნიკური პრობლემაა, მომწერე რომელი ღილაკი არ მუშაობს ან რა შეტყობინება ჩანს.',
      '4) თუ იდეა გჭირდება, შემიძლია მოგცე 3 უსაფრთხო სცენარი.',
      'მომწერე ერთი დამატებითი დეტალი და უფრო ზუსტ პასუხს მოგცემ.',
    ].join('\n'),
    [
      'I understand. Here is the best next step:',
      '1) Clarify what you want: complete a challenge, fix a technical issue, find an idea, or understand points.',
      '2) If it is about a challenge, start with a safe and simple version.',
      '3) If it is technical, tell me which button fails or what message you see.',
      '4) If you need an idea, I can give you 3 safe scenarios.',
      'Send one more detail and I will answer more precisely.',
    ].join('\n')
  );
}
function getSubmissionKey(submission: any) {
  return (
    submission.id ||
    submission.remoteId ||
    submission.remote_id ||
    `${submission.playerId || submission.player_id || 'player'}-${
      submission.challengeId || submission.challenge_id || 'challenge'
    }-${submission.createdAt || submission.created_at || Date.now()}`
  );
}

function loadLocalSubmissions() {
  const lists = getSubmissionStorageKeys().map(key =>
    storageService.loadData<any[]>(key, [])
  );

  return lists.flat();
}

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(submission => {
    if (!submission) return;

    const key = getSubmissionKey(submission);
    const previous = map.get(key) || {};

    map.set(key, {
      ...previous,
      ...submission,
      id: submission.id || previous.id || key,
      playerId: submission.playerId || submission.player_id || previous.playerId || '',
      challengeId:
        submission.challengeId || submission.challenge_id || previous.challengeId || '',
      marathonId:
        submission.marathonId || submission.marathon_id || previous.marathonId || '',
      tiktokUrl: submission.tiktokUrl || submission.tiktok_url || previous.tiktokUrl || '',
      socialUrl: submission.socialUrl || submission.social_url || previous.socialUrl || '',
      externalUrl: submission.externalUrl || submission.external_url || previous.externalUrl || '',
      likedBy:
        submission.likedBy ||
        submission.liked_by ||
        submission.votedUserIds ||
        submission.voted_user_ids ||
        previous.likedBy ||
        [],
      viewedBy:
        submission.viewedBy ||
        submission.viewed_by ||
        previous.viewedBy ||
        [],
      comments:
        submission.comments ||
        previous.comments ||
        [],
      siteViews:
        submission.siteViews ||
        submission.site_views ||
        previous.siteViews ||
        0,
      siteComments:
        submission.siteComments ||
        submission.site_comments ||
        previous.siteComments ||
        0,
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => getSubmissionDate(b) - getSubmissionDate(a)
  );
}

export default function PlayerCabinet({
  currentUser,
  submissions,
  monthlyPlayerRecords,
  onLeaveGame,
  onStateUpdate,
  lang = 'ka',
  activeCabinetTab,
  setActiveCabinetTab,
  selectedMarathonId,
  setSelectedMarathonId,
  onStartRegister,
  onStartLogin,
}: PlayerCabinetProps) {
  const [localTab, setLocalTab] = useState('progress');
  const cabinetTab = activeCabinetTab || localTab;
  const setCabinetTab = setActiveCabinetTab || setLocalTab;

  const [localSelectedMarathonId, setLocalSelectedMarathonId] =
    useState<string>('june');

  const activeMarathonId = selectedMarathonId || localSelectedMarathonId;
  const activeNormalizedMarathonId = normalizeMarathonId(activeMarathonId);
  const selectMarathonId = setSelectedMarathonId || setLocalSelectedMarathonId;

  const [localSubmissions, setLocalSubmissions] = useState<any[]>([]);
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [fullscreenMedia, setFullscreenMedia] =
    useState<FullscreenMedia | null>(null);

  const [guideInput, setGuideInput] = useState('');
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>([
    {
      id: 'guide-welcome',
      role: 'guide',
      text:
        lang === 'ka'
          ? 'გამარჯობა! მე ვარ შენი AI მეგზური. შემიძლია დაგეხმარო საიტის გამოყენებაში, გამოწვევის იდეებში, მოტივაციაში, ტექნიკური პრობლემების ნაბიჯ-ნაბიჯ მოგვარებაში და ასევე აგიხსნა ფულადი პრიზისა და ნებაყოფლობითი დონაციის წესები.'
          : 'Hi! I am your AI guide. I can help with navigation, challenge ideas, motivation and step-by-step troubleshooting.',
    },
  ]);

  useEffect(() => {
    let mounted = true;

    async function loadCabinetData() {
      try {
        const [loadedMarathons, loadedSubmissions] = await Promise.all([
          marathonService.getMarathons(),
          submissionService.getSubmissions(),
        ]);

        if (!mounted) return;

        setMarathons(loadedMarathons as Marathon[]);
        setLocalSubmissions(mergeSubmissions(loadLocalSubmissions(), loadedSubmissions));
      } catch (error) {
        console.warn('Cabinet online load failed, using local cache:', error);

        if (!mounted) return;

        setMarathons(
          storageService.loadData<Marathon[]>(storageKeys.marathons, [])
        );

        setLocalSubmissions(loadLocalSubmissions());
      }
    }

    loadCabinetData();

    return () => {
      mounted = false;
    };
  }, [
    cabinetTab,
    activeMarathonId,
    currentUser?.id,
    currentUser?.points,
    submissions,
  ]);

  const allSubmissions = useMemo(() => {
    return mergeSubmissions(
      loadLocalSubmissions(),
      localSubmissions,
      submissions || []
    );
  }, [submissions, localSubmissions]);

  const userSubmissions = useMemo(() => {
    if (!currentUser) return [];

    return allSubmissions.filter(
      submission => submission.playerId === currentUser.id
    );
  }, [allSubmissions, currentUser]);

  const userMarathonRecord = useMemo(() => {
    if (!currentUser) return null;

    const records =
      monthlyPlayerRecords ||
      storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);

    return (
      records.find(
        record =>
          record.playerId === currentUser.id &&
          record.marathonId === activeNormalizedMarathonId
      ) || null
    );
  }, [monthlyPlayerRecords, activeNormalizedMarathonId, currentUser]);

  const completedChallengeIds = useMemo(() => {
    const fromRecord = userMarathonRecord?.completedChallenges || [];
    const fromSubmissions = userSubmissions
      .map(submission => submission.challengeId)
      .filter(Boolean);

    return Array.from(new Set([...fromRecord, ...fromSubmissions]));
  }, [userMarathonRecord, userSubmissions]);

  const completedChallengeCards = useMemo(() => {
    if (!currentUser) return [];

    const submissionByChallenge = new Map<string, any>();

    userSubmissions.forEach(submission => {
      if (submission.challengeId) {
        submissionByChallenge.set(submission.challengeId, submission);
      }
    });

    const allChallenges = marathons.flatMap(
      marathon => marathon.challenges || []
    );

    const cardsFromCompletedIds = completedChallengeIds.map(challengeId => {
      const existingSubmission = submissionByChallenge.get(challengeId);

      if (existingSubmission) {
        return existingSubmission;
      }

      const challenge = allChallenges.find(item => item.id === challengeId);

      return {
        id: `completed-${currentUser.id}-${challengeId}`,
        playerId: currentUser.id,
        challengeId,
        marathonId: activeNormalizedMarathonId,
        submissionType: 'text',
        visibility: 'hidden',
        fileUrl: '',
        videoUrl: '',
        comment:
          lang === 'ka'
            ? 'გამოწვევა შესრულებულია. მედია ჩანაწერი ჯერ არ ჩანს.'
            : 'Challenge completed. Media proof is not visible yet.',
        reflectionText:
          lang === 'ka'
            ? 'გამოწვევა შესრულებულია. მედია ჩანაწერი ჯერ არ ჩანს.'
            : 'Challenge completed. Media proof is not visible yet.',
        challengeTitle:
          lang === 'ka'
            ? challenge?.title || 'გამოწვევა'
            : challenge?.title_en || challenge?.title || 'Challenge',
        createdAt: new Date().toISOString(),
      };
    });

    const extraSubmissions = userSubmissions.filter(
      submission => !completedChallengeIds.includes(submission.challengeId)
    );

    return [...cardsFromCompletedIds, ...extraSubmissions].sort(
      (a, b) => getSubmissionDate(b) - getSubmissionDate(a)
    );
  }, [
    currentUser,
    userSubmissions,
    completedChallengeIds,
    marathons,
    activeNormalizedMarathonId,
    lang,
  ]);

  const livePoints = useMemo(() => {
    if (!currentUser) return 0;

    return currentUser.points || 100;
  }, [currentUser]);

  const completedCount = completedChallengeCards.length;

  const publicCount = userSubmissions.filter(
    submission =>
      submission.visibility === 'public' ||
      submission.publishToWall === true ||
      submission.publish_to_wall === true ||
      submission.isPublic === true
  ).length;

  function handleGuideSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanInput = guideInput.trim();

    if (!cleanInput) return;

    const playerMessage: GuideMessage = {
      id: `player-${Date.now()}`,
      role: 'player',
      text: cleanInput,
    };

    const guideMessage: GuideMessage = {
      id: `guide-${Date.now()}`,
      role: 'guide',
      text: createGuideAnswer(cleanInput, lang),
    };

    setGuideMessages(prev => [...prev, playerMessage, guideMessage]);
    setGuideInput('');
  }

  const guestUser = {
    id: 'guest',
    nickname: lang === 'ka' ? 'სტუმარი' : 'Guest',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    points: 0,
  };

  const displayUser = currentUser || guestUser;

  const visibleMarathons =
    marathons.length > 0
      ? marathons
      : [
          {
            id: 'marathon-june',
            month: 'june',
            title_ka: 'ივნისი',
            title_en: 'June',
            startDate: '',
            endDate: '',
            timezone: 'Asia/Tbilisi',
            status: 'active',
            challenges: [],
            aiGenerated: false,
            approvedByAdmin: true,
            createdAt: new Date().toISOString(),
          },
        ];

  return (
    <div className="w-full space-y-5 overflow-x-hidden rounded-2xl bg-[#FAF8FF] p-3 font-sans text-[#27213F] antialiased sm:rounded-3xl sm:p-5 md:p-8">
      <div className="relative flex flex-col items-stretch justify-between gap-4 overflow-hidden rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:flex-row md:items-center">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-50/40 blur-3xl" />

        <div className="flex min-w-0 items-center gap-3 text-left sm:gap-4">
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce text-xl">
              👑
            </div>

            <img
              src={displayUser.avatar}
              className="h-12 w-12 rounded-full border-2 border-[#7C4DFF] bg-white object-cover p-0.5 shadow-sm sm:h-16 sm:w-16"
              alt="Avatar"
            />
          </div>

          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-base font-black text-[#1e1b35] sm:text-xl">
              @{displayUser.nickname}

              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                {currentUser
                  ? lang === 'ka'
                    ? '✨ აქტიური მოთამაშე'
                    : '✨ Active Player'
                  : lang === 'ka'
                    ? '👀 სტუმარი'
                    : '👀 Guest'}
              </span>
            </h2>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {lang === 'ka'
                ? 'მარათონის გამოწვევების დათვალიერება და შესრულება.'
                : 'View, explore and complete marathon challenges.'}
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full rounded-2xl bg-gradient-to-br from-[#6C40E7] to-[#4A24B2] px-5 py-3 text-center text-white shadow-md sm:min-w-[160px] md:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-200">
                {lang === 'ka' ? 'თქვენი ბალანსი' : 'Your balance'}
              </p>

              <p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-3xl font-black md:justify-end">
                {livePoints}
                <span className="text-xl">🪙</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onLeaveGame}
              className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] font-black text-rose-700"
            >
              {lang === 'ka' ? 'კაბინეტის გაუქმება' : 'Cancel cabinet'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onStartLogin}
              className="cursor-pointer whitespace-nowrap rounded-xl border border-violet-100 bg-slate-50 px-4 py-2 text-xs font-black uppercase text-[#7C4DFF] transition-all hover:bg-purple-50"
            >
              {lang === 'ka' ? '🔑 შესვლა' : '🔑 Sign in'}
            </button>

            <button
              type="button"
              onClick={onStartRegister}
              className="cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-4 py-2 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-[#6c3df0] hover:shadow-md"
            >
              {lang === 'ka' ? '🚀 რეგისტრაცია' : '🚀 Sign up'}
            </button>
          </div>
        )}
      </div>

      {!currentUser && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-purple-200/50 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent p-5 text-left shadow-sm sm:flex-row">
          <div className="space-y-1">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-[#1e1b35]">
              ⚡{' '}
              {lang === 'ka'
                ? 'საინტერესო გამოწვევები გელოდება!'
                : 'Interesting challenges await you!'}
            </h4>

            <p className="max-w-xl text-[11px] leading-relaxed text-slate-500">
              {lang === 'ka'
                ? 'თქვენ იმყოფებით საცდელ რეჟიმში. შეგიძლიათ თავისუფლად ათვალიეროთ გამოწვევები. თამაშში ჩასართავად, ქულების მოსაპოვებლად და მედიის ასატვირთად გაიარეთ რეგისტრაცია.'
                : 'You are in guest mode. You can browse the challenges. To enter the tournament, submit proof and gain points, create an account.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartRegister}
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-4 py-2 text-[11px] font-black text-white shadow-sm transition-all hover:bg-[#6c3df0]"
          >
            {lang === 'ka' ? 'ჩაერთე მარათონში' : 'Join the marathon'}
          </button>
        </div>
      )}

      {currentUser && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'შესრულებული' : 'Completed'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {completedCount}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {lang === 'ka' ? 'ჯამურად' : 'total'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7C4DFF]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'ბალანსი' : 'Balance'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {livePoints}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {lang === 'ka' ? 'ქულა' : 'pts'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Flame className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'საჯარო' : 'Public'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {publicCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'პროფილი' : 'Profile'}
              </p>

              <p className="mt-1 text-xs font-black text-[#1e1b35]">
                {currentUser.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString()
                  : lang === 'ka'
                    ? 'აქტიური'
                    : 'Active'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
        {visibleMarathons.map(marathon => {
          const id = marathon.id;
          const shortId = shortMarathonId(id);
          const isActive =
            activeMarathonId === id ||
            activeMarathonId === shortId ||
            activeNormalizedMarathonId === id;

          const marathonSubmissions = userSubmissions.filter(
            submission =>
              submission.marathonId === id ||
              submission.marathonId === shortId ||
              submission.marathonId === normalizeMarathonId(shortId)
          );

          const totalChallenges = marathon.challenges?.length || 10;
          const completed = marathonSubmissions.length;
          const progress = Math.min(100, (completed / totalChallenges) * 100);

          return (
            <button
              type="button"
              key={id}
              onClick={() => {
                selectMarathonId(shortId);
                setCabinetTab('challenges');
              }}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all hover:shadow-md ${
                isActive
                  ? 'border-[#7C4DFF] ring-2 ring-[#7C4DFF]/15'
                  : 'border-violet-100/60'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {lang === 'ka' ? 'მარათონი' : 'Marathon'}
                </span>

                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    marathon.status === 'active'
                      ? 'border border-orange-100 bg-orange-50 text-orange-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {marathon.status === 'active'
                    ? lang === 'ka'
                      ? 'მიმდინარეობს'
                      : 'Live'
                    : lang === 'ka'
                      ? 'მალე'
                      : 'Soon'}
                </span>
              </div>

              <h3 className="flex items-center gap-1.5 text-base font-black text-[#1e1b35]">
                📅 {lang === 'ka' ? marathon.title_ka : marathon.title_en}
              </h3>

              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                {marathon.startDate && marathon.endDate
                  ? `${new Date(marathon.startDate).toLocaleDateString()} — ${new Date(
                      marathon.endDate
                    ).toLocaleDateString()}`
                  : lang === 'ka'
                    ? 'მარათონის პერიოდი'
                    : 'Marathon period'}
              </p>

              <div className="mt-4 space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between font-mono text-[10px] font-bold text-slate-400">
                  <span>
                    {lang === 'ka' ? 'შესრულებული:' : 'Completed:'}{' '}
                    {completed} / {totalChallenges}
                  </span>

                  <span className="text-[#7C4DFF]">+20 🪙</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex select-none gap-1.5 overflow-x-auto border-b border-violet-100/80 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          {
            id: 'challenges',
            label_ka: '🚀 აქტიური გამოწვევები',
            label_en: 'ACTIVE CHALLENGES',
          },
          {
            id: 'videos',
            label_ka: '🎬 შესრულებული გამოწვევები',
            label_en: 'COMPLETED CHALLENGES',
          },
          {
            id: 'consultation',
            label_ka: '🤖 AI მეგზური',
            label_en: 'AI GUIDE',
          },
        ].map(tab => {
          if (tab.id === 'consultation' && !currentUser) return null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCabinetTab(tab.id)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[11px] font-black transition-all sm:px-5 sm:text-xs ${
                cabinetTab === tab.id
                  ? 'bg-[#7C4DFF] text-white shadow-sm shadow-[#7C4DFF]/20'
                  : 'border border-violet-100/50 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang === 'ka' ? tab.label_ka : tab.label_en}
            </button>
          );
        })}
      </div>

      <div className="pt-2 text-left">
        {(cabinetTab === 'challenges' ||
          cabinetTab === 'progress' ||
          cabinetTab === 'marathons') && (
          <ChallengeView
            currentUser={currentUser}
            submissions={allSubmissions}
            monthlyPlayerRecords={monthlyPlayerRecords}
            onStateUpdate={onStateUpdate || (() => {})}
            selectedMarathonId={activeMarathonId}
            lang={lang}
            onStartRegister={onStartRegister}
            onStartLogin={onStartLogin}
          />
        )}

        {cabinetTab === 'videos' &&
          (completedChallengeCards.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
              {lang === 'ka'
                ? 'ჯერ არ გაქვთ შესრულებული გამოწვევები.'
                : 'No completed logs found yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completedChallengeCards.map((submission: any) => {
                const url = getMediaUrl(submission);
                const isTiktok = isTikTokSubmission(submission);
                const type = isTiktok ? 'tiktok' : submission.submissionType;
                const siteViews =
                  submission.siteViews || submission.site_views || submission.viewedBy?.length || 0;
                const siteLikes =
                  submission.siteLikes || submission.site_likes || submission.likedBy?.length || submission.votes || 0;
                const siteComments =
                  submission.siteComments || submission.site_comments || submission.comments?.length || 0;

                return (
                  <button
                    type="button"
                    key={submission.id}
                    onClick={() =>
                      setFullscreenMedia({
                        url,
                        type,
                        title:
                          submission.challengeTitle ||
                          submission.challenge_title ||
                          (lang === 'ka' ? 'გამოწვევა' : 'Challenge'),
                        submission,
                      })
                    }
                    className="cursor-pointer space-y-2 rounded-xl border border-violet-100/60 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#7C4DFF]">
                        {isTiktok ? 'TIKTOK LINK' : `${submission.submissionType || 'proof'} PROOF`}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          submission.visibility === 'public' ||
                          submission.publishToWall === true ||
                          submission.publish_to_wall === true
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-purple-50 text-[#7C4DFF]'
                        }`}
                      >
                        {submission.visibility === 'public' ||
                        submission.publishToWall === true ||
                        submission.publish_to_wall === true
                          ? lang === 'ka'
                            ? 'საჯარო'
                            : 'Public'
                          : lang === 'ka'
                            ? 'პირადი'
                            : 'Private'}
                      </span>
                    </div>

                    <h4 className="truncate text-xs font-bold text-[#27213F]">
                      {submission.challengeTitle ||
                        submission.challenge_title ||
                        (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
                    </h4>

                    <div className="group relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-900 text-xs font-bold text-white">
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                        ▶ {lang === 'ka' ? 'გახსნა' : 'Open'}
                      </div>

                      {isTiktok && url && (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#111827] to-[#2d0b45] text-center">
                          <ExternalLink className="mb-2 h-6 w-6 text-fuchsia-200" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-100">
                            TikTok Proof
                          </span>
                        </div>
                      )}

                      {!isTiktok && submission.submissionType === 'video' && url && (
                        <video
                          src={url}
                          className="h-full w-full object-cover"
                        />
                      )}

                      {!isTiktok && submission.submissionType === 'photo' && url && (
                        <img
                          src={url}
                          className="h-full w-full object-cover"
                          alt="Proof"
                        />
                      )}

                      {!isTiktok && submission.submissionType === 'audio' && url && (
                        <Volume2 className="h-6 w-6 text-slate-400" />
                      )}

                      {!url && (
                        <span className="px-3 text-center text-[11px] text-slate-400">
                          {getSubmissionText(submission) ||
                            (lang === 'ka'
                              ? 'ტექსტური ჩანაწერი'
                              : 'Text log')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black text-slate-500">
                      <div className="rounded-lg bg-violet-50 py-1.5">👁 {siteViews}</div>
                      <div className="rounded-lg bg-rose-50 py-1.5">❤️ {siteLikes}</div>
                      <div className="rounded-lg bg-emerald-50 py-1.5">💬 {siteComments}</div>
                    </div>

                    <p className="line-clamp-2 text-[11px] font-medium text-slate-500">
                      {getSubmissionText(submission) ||
                        (lang === 'ka'
                          ? 'შესრულებული გამოწვევა'
                          : 'Completed challenge')}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}

        {cabinetTab === 'consultation' && currentUser && (
          <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-violet-100/80 bg-white p-4 text-left shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C4DFF]/10 text-[#7C4DFF]">
                <Bot className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-black uppercase text-[#27213F]">
                  {lang === 'ka' ? 'AI მეგზური' : 'AI Guide'}
                </h3>

                <p className="text-xs leading-relaxed text-slate-500">
                  {lang === 'ka'
                    ? 'მეგობრული დამხმარე საიტის ნავიგაციისთვის, გამოწვევის იდეებისთვის, მოტივაციისთვის და ტექნიკური პრობლემების მარტივად ახსნისთვის.'
                    : 'A friendly helper for navigation, challenge ideas, motivation and simple troubleshooting.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-800">
              {lang === 'ka'
                ? 'შენიშვნა: AI მეგზური არის თამაშის დამხმარე და მოტივატორი. ის არ ცვლის ექიმს, ფსიქოლოგს ან იურისტს.'
                : 'Note: the AI guide is a game helper and motivator. It does not replace a doctor, therapist or lawyer.'}
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
              {guideMessages.map(message => (
                <div
                  key={message.id}
                  className={`max-w-[86%] rounded-2xl p-3 text-xs leading-6 ${
                    message.role === 'guide'
                      ? 'bg-white text-slate-700 shadow-sm'
                      : 'ml-auto bg-[#7C4DFF] text-white'
                  }`}
                >
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider opacity-70">
                    {message.role === 'guide'
                      ? lang === 'ka'
                        ? 'AI მეგზური'
                        : 'AI Guide'
                      : lang === 'ka'
                        ? 'თქვენ'
                        : 'You'}
                  </p>

                  {message.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleGuideSubmit} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={guideInput}
                onChange={event => setGuideInput(event.target.value)}
                placeholder={
                  lang === 'ka'
                    ? 'მაგალითად: როგორ ჩავასვა TikTok ბმული?'
                    : 'Example: how do I submit a TikTok link?'
                }
                className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-[#FAF8FF] p-3 text-xs outline-none focus:border-[#7C4DFF]"
              />

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C4DFF] px-4 py-3 text-xs font-black text-white"
              >
                <Send className="h-4 w-4" />
                {lang === 'ka' ? 'გაგზავნა' : 'Send'}
              </button>
            </form>

            <div className="grid gap-2 text-[11px] font-bold text-slate-600 sm:grid-cols-3">
              {[
                lang === 'ka' ? 'როგორ დავადასტურო გამოწვევა?' : 'How do I confirm a challenge?',
                lang === 'ka' ? 'მომეცი უსაფრთხო იდეა' : 'Give me a safe idea',
                lang === 'ka' ? 'როგორ მუშაობს ქულები?' : 'How do points work?',
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setGuideInput(prompt)}
                  className="rounded-xl border border-violet-100 bg-white p-3 text-left hover:bg-violet-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {fullscreenMedia && (
        <div className="fixed inset-0 z-[55] flex flex-col items-center justify-start overflow-y-auto bg-black/90 p-2 pt-4 text-white backdrop-blur-md sm:justify-center sm:p-4">
          <div className="w-full max-w-2xl space-y-3 text-center sm:space-y-4">
            <h3 className="truncate px-4 text-sm font-bold">
              {fullscreenMedia.title}
            </h3>

            <div className="flex max-h-[48dvh] min-h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-black sm:max-h-[60vh] sm:min-h-[240px]">
              {fullscreenMedia.type === 'tiktok' && fullscreenMedia.url && (
                (() => {
                  const cleanUrl = normalizeTikTokUrl(fullscreenMedia.url);
                  const videoId = extractTikTokVideoId(cleanUrl);

                  if (videoId) {
                    return (
                      <iframe
                        src={`https://www.tiktok.com/embed/v2/${videoId}`}
                        title="TikTok video"
                        allow="fullscreen"
                        className="h-[440px] w-full max-w-md border-0 bg-black sm:h-[540px]"
                      />
                    );
                  }

                  return (
                    <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#111827] to-[#2d0b45] p-8 text-center">
                      <ExternalLink className="mb-4 h-12 w-12 text-fuchsia-200" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-fuchsia-100">
                        TikTok Proof
                      </p>
                      <p className="mt-3 max-w-md text-xs leading-6 text-slate-300">
                        {lang === 'ka'
                          ? 'ვიდეო TikTok-ზეა გამოქვეყნებული. გახსენი ბმული ახალ ფანჯარაში.'
                          : 'The video is published on TikTok. Open the link in a new tab.'}
                      </p>
                      <a
                        href={fullscreenMedia.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-black text-slate-950"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {lang === 'ka' ? 'TikTok-ზე ნახვა' : 'Open on TikTok'}
                      </a>
                    </div>
                  );
                })()
              )}

              {fullscreenMedia.submission && (
                <div className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 text-left text-xs leading-6 text-slate-200">
                  <div className="grid grid-cols-3 gap-2 text-center font-black">
                    <div className="rounded-xl bg-white/10 p-2">
                      👁 {fullscreenMedia.submission.viewedBy?.length || fullscreenMedia.submission.siteViews || 0}
                    </div>
                    <div className="rounded-xl bg-white/10 p-2">
                      ❤️ {fullscreenMedia.submission.likedBy?.length || fullscreenMedia.submission.likes || 0}
                    </div>
                    <div className="rounded-xl bg-white/10 p-2">
                      💬 {fullscreenMedia.submission.comments?.length || fullscreenMedia.submission.siteComments || 0}
                    </div>
                  </div>

                  {fullscreenMedia.submission.comments?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                        {lang === 'ka' ? 'კომენტარები' : 'Comments'}
                      </p>

                      {fullscreenMedia.submission.comments.slice(0, 5).map((comment: any) => (
                        <div key={comment.id || comment.createdAt} className="rounded-xl bg-white/10 p-2">
                          <p className="font-bold text-violet-200">
                            @{comment.authorNickname || comment.nickname || 'სტუმარი'}
                          </p>
                          <p>{comment.text || comment.comment || ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {fullscreenMedia.type === 'video' && fullscreenMedia.url && (
                <video
                  src={fullscreenMedia.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-full"
                />
              )}

              {fullscreenMedia.type === 'photo' && fullscreenMedia.url && (
                <img
                  src={fullscreenMedia.url}
                  className="max-h-[60vh] object-contain"
                  alt="Proof"
                />
              )}

              {fullscreenMedia.type === 'audio' && fullscreenMedia.url && (
                <div className="w-full p-12 text-center">
                  <Volume2 className="mx-auto mb-2 h-12 w-12 text-[#7C4DFF]" />
                  <audio
                    src={fullscreenMedia.url}
                    controls
                    autoPlay
                    className="w-full"
                  />
                </div>
              )}

              {!fullscreenMedia.url && (
                <div className="p-8 text-sm text-slate-300">
                  {lang === 'ka'
                    ? 'მედია ფაილი არ არის ხელმისაწვდომი.'
                    : 'Media file is not available.'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFullscreenMedia(null)}
              className="mx-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#7C4DFF] px-8 py-3 text-xs font-bold uppercase text-white hover:bg-[#6c3df0]"
            >
              <X className="h-4 w-4" />

              <span>
                {lang === 'ka'
                  ? 'ჩვეულ ფორმაში დაბრუნება'
                  : 'Close fullscreen'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

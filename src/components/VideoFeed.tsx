import React, { useEffect, useState } from 'react';
import { Heart, Lock, Volume2, X } from 'lucide-react';

import { Submission, User } from '../types';
import { submissionService } from '../services/submissionService';

interface VideoFeedProps {
  currentUser: User;
  onStateUpdate: () => void;
  lang?: 'ka' | 'en';
}

export default function VideoFeed({
  currentUser,
  onStateUpdate,
  lang = 'ka',
}: VideoFeedProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fullscreenSubmission, setFullscreenSubmission] =
    useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadPublicSubmissions() {
    try {
      setLoading(true);
      setErrorMessage('');

      const allSubmissions = await submissionService.getSubmissions();

      const publicSubmissions = allSubmissions.filter(
        submission => submission.visibility === 'public'
      );

      setSubmissions(publicSubmissions);
    } catch (error: any) {
      console.error('VideoFeed load error:', error);
      setErrorMessage(
        lang === 'ka'
          ? 'საჯარო აქტივობების ჩატვირთვა ვერ მოხერხდა.'
          : 'Could not load public submissions.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublicSubmissions();
  }, [currentUser.id]);

  async function handleLike(submissionId: string) {
    try {
      setLikeLoadingId(submissionId);
      setErrorMessage('');

      await submissionService.voteSubmission(submissionId, currentUser.id);

      await loadPublicSubmissions();
      onStateUpdate();
    } catch (error: any) {
      console.error('Like error:', error);
      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'მოწონების დამატება ვერ მოხერხდა.'
            : 'Could not add like.')
      );
    } finally {
      setLikeLoadingId(null);
    }
  }

  function getMediaUrl(submission: Submission) {
    return submission.fileUrl || submission.videoUrl || '';
  }

  function renderMediaPreview(submission: Submission) {
    const url = getMediaUrl(submission);

    if (!url && !submission.reflectionText && !submission.comment) {
      return (
        <div className="flex h-36 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Lock className="mr-2 h-5 w-5" />
          <span className="text-xs font-bold">
            {lang === 'ka' ? 'მედია არ არის' : 'No media'}
          </span>
        </div>
      );
    }

    if (submission.submissionType === 'photo' && url) {
      return (
        <img
          src={url}
          className="h-36 w-full rounded-xl object-cover"
          alt={lang === 'ka' ? 'აქტივობის ფოტო' : 'Submission photo'}
        />
      );
    }

    if (submission.submissionType === 'video' && url) {
      return (
        <video
          src={url}
          className="h-36 w-full rounded-xl bg-black object-cover"
          muted
          playsInline
        />
      );
    }

    if (submission.submissionType === 'audio' && url) {
      return (
        <div className="flex h-36 flex-col items-center justify-center rounded-xl bg-slate-950 text-white">
          <Volume2 className="mb-2 h-8 w-8 animate-pulse text-violet-300" />
          <span className="text-xs font-bold">
            {lang === 'ka' ? 'აუდიო აქტივობა' : 'Audio submission'}
          </span>
        </div>
      );
    }

    return (
      <div className="flex h-36 items-center justify-center rounded-xl bg-violet-50 p-4 text-center text-xs font-bold leading-6 text-violet-700">
        {submission.reflectionText ||
          submission.comment ||
          (lang === 'ka' ? 'ტექსტური აქტივობა' : 'Text submission')}
      </div>
    );
  }

  function renderFullscreenMedia(submission: Submission) {
    const url = getMediaUrl(submission);

    if (submission.submissionType === 'photo' && url) {
      return (
        <img
          src={url}
          className="mx-auto max-h-[70vh] w-full rounded-2xl border border-white/10 bg-black object-contain"
          alt={lang === 'ka' ? 'აქტივობის ფოტო' : 'Submission photo'}
        />
      );
    }

    if (submission.submissionType === 'audio' && url) {
      return (
        <div className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-12 text-center">
          <Volume2 className="mx-auto mb-4 h-12 w-12 animate-pulse text-violet-300" />
          <audio src={url} controls autoPlay className="mt-4 w-full" />
        </div>
      );
    }

    if (submission.submissionType === 'video' && url) {
      return (
        <video
          src={url}
          controls
          autoPlay
          className="max-h-[70vh] w-full rounded-2xl border border-white/10 bg-black"
        />
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-left text-sm leading-7 text-white">
        {submission.reflectionText ||
          submission.comment ||
          (lang === 'ka' ? 'ტექსტი არ არის დამატებული.' : 'No text added.')}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="rounded-2xl border bg-white p-4 text-left">
        <h3 className="text-sm font-extrabold uppercase text-[#27213F]">
          {lang === 'ka'
            ? '🌐 სიმამაცის საჯარო კედელი'
            : '🌐 Live Public Matrix Stream'}
        </h3>

        <p className="mt-0.5 text-xs text-slate-500">
          {lang === 'ka'
            ? 'აქ გამოჩნდება მოთამაშეების საჯარო ფოტო, ვიდეო, აუდიო და ტექსტური აქტივობები.'
            : 'Review public proofs and support players with likes.'}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
          {lang === 'ka' ? 'იტვირთება...' : 'Loading...'}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
          {lang === 'ka'
            ? 'საჯარო აქტივობები ამ დროისთვის ცარიელია.'
            : 'No public submissions loaded yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {submissions.map(submission => {
            const alreadyLiked =
              submission.likedBy?.includes(currentUser.id) ||
              submission.votedUserIds?.includes(currentUser.id);

            const isOwnSubmission = submission.playerId === currentUser.id;

            return (
              <div
                key={submission.id}
                className="space-y-3 rounded-2xl border bg-white p-4 shadow-xs"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  {submission.playerAvatar ? (
                    <img
                      src={submission.playerAvatar}
                      className="h-5 w-5 rounded-full object-cover"
                      alt="avatar"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-violet-100" />
                  )}

                  <span>@{submission.playerNickname || 'მოთამაშე'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setFullscreenSubmission(submission)}
                  className="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-black text-left"
                >
                  {renderMediaPreview(submission)}

                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-xs font-black text-white opacity-0 transition-opacity hover:opacity-100">
                    ▶ {lang === 'ka' ? 'ნახვა' : 'Open'}
                  </div>
                </button>

                <h4 className="truncate text-xs font-black text-[#27213F]">
                  {submission.challengeTitle ||
                    (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
                </h4>

                {(submission.reflectionText || submission.comment) && (
                  <p className="line-clamp-2 text-[11px] text-slate-500">
                    “{submission.reflectionText || submission.comment}”
                  </p>
                )}

                <div className="flex items-center justify-between border-t pt-2">
                  <button
                    type="button"
                    onClick={() => handleLike(submission.id)}
                    disabled={
                      likeLoadingId === submission.id ||
                      alreadyLiked ||
                      isOwnSubmission
                    }
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition-all ${
                      alreadyLiked || isOwnSubmission
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-purple-50 text-[#7C4DFF] hover:bg-purple-100'
                    }`}
                  >
                    <Heart className="h-3 w-3" />
                    {submission.likes || submission.votes || 0}{' '}
                    {lang === 'ka' ? 'მოწონება' : 'Likes'}
                  </button>

                  <span className="font-mono text-[9px] text-slate-400">
                    {isOwnSubmission
                      ? lang === 'ka'
                        ? 'საკუთარზე არა'
                        : 'Own post'
                      : alreadyLiked
                        ? lang === 'ka'
                          ? 'უკვე მოიწონე'
                          : 'Liked'
                        : '+2'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fullscreenSubmission && (
        <div className="fixed inset-0 z-55 flex flex-col items-center justify-center bg-black/90 p-4 text-white backdrop-blur-sm">
          <div className="w-full max-w-2xl space-y-4 text-center">
            {renderFullscreenMedia(fullscreenSubmission)}

            <button
              type="button"
              onClick={() => setFullscreenSubmission(null)}
              className="mx-auto flex items-center gap-2 rounded-xl bg-[#7C4DFF] px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md"
            >
              <X className="h-4 w-4" />
              {lang === 'ka' ? 'დახურვა' : 'Close Player'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

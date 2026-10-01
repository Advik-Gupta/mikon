"use client";

import { motion } from "motion/react";
import { PartyPopper } from "lucide-react";
import { Modal } from "../Modal";
import { InviteCard } from "../social/InviteCard";
import { Button } from "../ui";

const BITS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: (i % 6) * 0.08,
  color: ["#c6f432", "#5aaeff", "#ff9a3c", "#a78bfa", "#3dd6d0"][i % 5],
  rotate: (i * 47) % 360,
}));

export function CongratsModal({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your first program is ready"
      className="max-w-md"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose} className="px-6">
            Let&apos;s go
          </Button>
        </div>
      }
    >
      <div className="relative -mx-5 -mt-5 mb-4 h-28 overflow-hidden bg-gradient-to-br from-accent/20 via-surface-2 to-info/15 sm:-mx-6">
        {BITS.map((b, i) => (
          <motion.span
            key={i}
            className="absolute top-0 h-2.5 w-1.5 rounded-sm"
            style={{ left: `${b.x}%`, background: b.color, rotate: b.rotate }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 130, opacity: [0, 1, 1, 0], rotate: b.rotate + 180 }}
            transition={{ duration: 1.8, delay: b.delay, repeat: 1, ease: "easeIn" }}
          />
        ))}
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[0_12px_30px_-10px_rgb(198_244_50/0.7)]"
        >
          <PartyPopper className="size-7" />
        </motion.span>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        <span className="font-medium text-ink">{name}</span> is saved. Training is better with company, so bring your friends along. You&apos;ll see each other&apos;s
        programs and race each other on shared lifts.
      </p>
      <div className="mt-4">
        <InviteCard compact />
      </div>
    </Modal>
  );
}

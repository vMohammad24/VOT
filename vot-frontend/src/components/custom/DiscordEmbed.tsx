"use client";
import styles from "@/styles/Embed.module.css";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
export interface Embed {
  header?: string;
  author?: string;
  title: string;
  description: string;
  color: string;
  timestamp?: string;
}

export interface EmbedProps {
  embed: Embed;
}

function generateRandomColor() {
  return `#${(((1 << 24) * Math.random()) | 0).toString(16)}`;
}

export default function Embed({ embed }: EmbedProps) {
  const NULL_DATE = "0001-01-01T00:00:00Z";
  return (
    <div className={styles.parent}>
      <div
        className={styles.embed}
        style={{
          borderLeftColor:
            embed.color == "random" ? generateRandomColor() : embed.color,
        }}
      >
        <div className={styles.embedContent}>
          {embed.header && (
            <div className={styles.provider}>
              <p className={styles.providerText}>{embed.header}</p>
            </div>
          )}

          {embed.author && (
            <div className={styles.author}>
              <p className={styles.authorText}>{embed.author}</p>
            </div>
          )}

          <div className={styles.title}>
            <p className={styles.titleText}>{embed.title}</p>
          </div>

          {embed.description && (
            <div className={styles.description}>{embed.description}</div>
          )}

          <div className={styles.image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Example Image"
              src="https://cdn.nest.rip/uploads/d7yZ637gYLqwoMRW4iuE3eVZ2pd516ao.png"
              width={256}
              height={256}
              className={"object-fill"}
            />
          </div>

          {embed.timestamp == NULL_DATE && (
            <div className={styles.footer}>
              <span className={styles.footerText}>
                {embed.timestamp
                  ? embed.timestamp == NULL_DATE
                    ? dayjs().calendar()
                    : dayjs(new Date(embed.timestamp)).calendar()
                  : "Timestamp Disabled"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

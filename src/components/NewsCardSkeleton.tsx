export default function NewsCardSkeleton({ featured = false }: { featured?: boolean }) {
  return <div className={featured ? "news-card-skeleton featured" : "news-card-skeleton"} aria-hidden="true" />;
}

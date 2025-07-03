import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background/80 backdrop-blur-sm fixed inset-0 z-50">
      <div className="animate-pulse">
        <Image 
          src="/dr-enterprise-logo.png" 
          alt="D.R. Enterprise Logo" 
          width={150} 
          height={150} 
        />
      </div>
    </div>
  )
}

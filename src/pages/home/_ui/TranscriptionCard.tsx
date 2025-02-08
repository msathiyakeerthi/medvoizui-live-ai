import { FC } from 'react';
import { format } from 'date-fns';

interface TranscriptionCardProps {
  text: string;
  timestamp: Date;
  status?: 'pending' | 'completed' | 'error';
}

const TranscriptionCard: FC<TranscriptionCardProps> = ({ text, timestamp = 'completed' }) => (
  <div className='flex items-center w-full'>
    <div className='bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full'>
      <div className='flex flex-col gap-2'>
        <div className='text-xs font-medium text-gray-400'>
          {format(timestamp, 'HH:mm')}
        </div>
        <div className='text-sm text-gray-600'>
          <p>{text}</p>
        </div>
      </div>
    </div>
  </div>
);

export default TranscriptionCard; 
import {FC} from "react";

interface IOutputscreenProps {}

const Outputscreen: FC<IOutputscreenProps> = () => {
	return (
		<div className='aspect-video bg-black rounded-2xl relative overflow-hidden shadow-lg border border-gray-200'>
			<div className='absolute inset-0 flex items-center justify-center'>
				<div className='w-full h-full md:w-2/3 md:h-auto aspect-video'>
					<img src='/placeholder.svg' alt='Main participant' className='w-full h-full object-cover' />
				</div>
			</div>
		</div>
	);
};
export default Outputscreen;

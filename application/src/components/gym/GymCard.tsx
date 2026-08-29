import { Gym } from "../../types/gym.types";
import { TouchableOpacity, Image, Text } from "react-native";
interface Props {
  gym: Gym;
  onPress: () => void;
}

export const GymCard = ({ gym, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Image source={{ uri: gym.photos[0] }} />
      <Text>{gym.name}</Text>
      <Text>{gym.address}</Text>
      <Text>
        {gym.openingTime} – {gym.closingTime}
      </Text>
      {gym.amenities.map((tag) => (
        // <AmenityTag key={tag} label={tag} />
        <Text>{tag}</Text>
      ))}
    </TouchableOpacity>
  );
};

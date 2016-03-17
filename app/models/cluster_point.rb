class ClusterPoint
  include Mongoid::Document

  belongs_to :single_cell
  belongs_to :cluster

  field :x, type: Float
  field :y, type: Float

end